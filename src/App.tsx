import { useEffect, useMemo, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Header from "./shared/components/Header";
import { useSettings } from "./features/settings/hooks/useSettings";
import { getDailyNotePath } from "./features/settings/utils/pathHelpers";
import { useFileWatcher } from "./features/daily-note/hooks/useFileWatcher";
import { useDailyNote } from "./features/daily-note/hooks/useDailyNote";
import { NoteRenderer } from "./features/daily-note/components/NoteRenderer";
import { SettingsDrawer } from "./features/settings/components/SettingsDrawer";
import { ActiveTaskZone } from "./features/active-task/components/ActiveTaskZone";
import { PomodoroTimer } from "./features/pomodoro/components/PomodoroTimer";
import { usePomodoro } from "./features/pomodoro/hooks/usePomodoro";
import { useBreakReminder } from "./features/break-reminder/hooks/useBreakReminder";
import { MicroBreakOverlay } from "./features/break-reminder/components/MicroBreakOverlay";
import { parseTasks, cleanTaskText } from "./features/active-task/utils/taskParser";
import { compileIfTimeSectionRegex } from "./features/settings/utils/sectionPattern";
import styles from "./App.module.css";

export default function App() {
  const { settings, updateSetting, ready } = useSettings();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    getCurrentWindow().setVisibleOnAllWorkspaces(true);
  }, []);

  const notePath = useMemo(() => {
    if (!ready || !settings.vaultPath) return null;
    return getDailyNotePath(
      settings.vaultPath,
      settings.dailyNotesFolder,
      settings.filenameFormat
    );
  }, [ready, settings.vaultPath, settings.dailyNotesFolder, settings.filenameFormat]);

  useFileWatcher(notePath);
  const {
    sections,
    preamble,
    tasks,
    loading,
    error,
    notFound,
    toggleTask,
    editTask,
  } = useDailyNote(notePath);

  // Pomodoro — lifted here so break reminders can observe state
  const pomodoroState = usePomodoro(settings.pomodoro);

  // Extract a random unchecked "If time" task for the long break window
  const ifTimeTask = useMemo(() => {
    const pattern = compileIfTimeSectionRegex(settings.ifTimeSectionPattern);
    const ifTimeSection = sections.find((s) => pattern.test(s.title));
    if (!ifTimeSection) return "";

    const unchecked = parseTasks(ifTimeSection.content).filter((t) => !t.checked);
    if (unchecked.length === 0) return "";
    const pick = unchecked[Math.floor(Math.random() * unchecked.length)];
    return cleanTaskText(pick.taskText);
  }, [sections, settings.ifTimeSectionPattern]);

  const { microBreakVisible, messageIndex, messages, snoozeMicro, dismissMicro } =
    useBreakReminder(
      { mode: pomodoroState.mode, phase: pomodoroState.phase },
      ifTimeTask,
      settings.breaks
    );

  return (
    <div className={styles.app}>
      {microBreakVisible && (
        <MicroBreakOverlay
          messageIndex={messageIndex}
          messages={messages}
          autoDismissMs={(settings.breaks?.microDuration ?? 20) * 1000}
          onSnooze={snoozeMicro}
          onDismiss={dismissMicro}
        />
      )}

      <Header onOpenSettings={() => setDrawerOpen(true)} />

      <ActiveTaskZone
        tasks={tasks}
      />

      {/* Timer zone */}
      <section className={styles.timerZone}>
        <PomodoroTimer
          mode={pomodoroState.mode}
          phase={pomodoroState.phase}
          remaining={pomodoroState.remaining}
          progress={pomodoroState.progress}
          sessionCount={pomodoroState.sessionCount}
          start={pomodoroState.start}
          pause={pomodoroState.pause}
          resume={pomodoroState.resume}
          reset={pomodoroState.reset}
          skip={pomodoroState.skip}
        />
      </section>

      {/* Daily note zone */}
      <section className={styles.noteZone}>
        {!ready ? null : !settings.vaultPath ? (
          <p className={styles.placeholder}>
            Open ⚙ Settings to configure your vault.
          </p>
        ) : loading ? (
          <p className={styles.placeholder}>Loading…</p>
        ) : notFound ? (
          <div>
            <p className={styles.placeholder}>No note for today yet.</p>
            <p className={styles.placeholderSub}>{notePath}</p>
          </div>
        ) : error ? (
          <p className={styles.placeholder}>{error}</p>
        ) : (
          <NoteRenderer
            preamble={preamble}
            sections={sections}
            tasks={tasks}
            onToggleTask={toggleTask}
            onEditTask={editTask}
            vaultName={settings.vaultPath?.split("/").filter(Boolean).pop()}
            vaultPath={settings.vaultPath}
            notePath={notePath}
          />
        )}
      </section>

      {/* Settings drawer — rendered above everything */}
      <SettingsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        settings={settings}
        updateSetting={updateSetting}
      />
    </div>
  );
}
