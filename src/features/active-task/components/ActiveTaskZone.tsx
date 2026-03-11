import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle } from "@phosphor-icons/react";
import type { Task } from "../utils/taskParser";
import { cleanTaskText, findActiveTaskIndex } from "../utils/taskParser";
import styles from "./ActiveTaskZone.module.css";

interface Props {
  tasks: Task[];
  onToggleTask: (taskIdx: number) => void | Promise<void>;
  onUpdateTaskText: (taskIdx: number, newText: string) => void | Promise<void>;
  onSetTaskTimeBlock: (
    taskIdx: number,
    start: string | null,
    end: string | null
  ) => void | Promise<void>;
}

export function ActiveTaskZone({
  tasks,
  onToggleTask,
  onUpdateTaskText,
  onSetTaskTimeBlock,
}: Props) {
  const [editingTaskIdx, setEditingTaskIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [timePickerTaskIdx, setTimePickerTaskIdx] = useState<number | null>(null);
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const skipBlurCommitRef = useRef(false);

  const activeTaskIdx = useMemo(() => {
    const idx = findActiveTaskIndex(tasks);
    return idx >= 0 ? idx : null;
  }, [tasks]);

  const uncheckedRows = useMemo(
    () => tasks.map((task, idx) => ({ task, idx })).filter((entry) => !entry.task.checked),
    [tasks]
  );

  const allDone = tasks.length > 0 && tasks.every((t) => t.checked);
  const timePopoverRef = useRef<HTMLDivElement | null>(null);

  const prevAllDone = useRef(false);

  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.3 },
        colors: ["#e87040", "#e8a040", "#7db87a", "#4da8d4"],
      });
    }
    prevAllDone.current = allDone;
  }, [allDone]);

  useEffect(() => {
    if (timePickerTaskIdx === null) return;

    function handleClickOutside(event: MouseEvent) {
      if (!timePopoverRef.current) return;
      if (timePopoverRef.current.contains(event.target as Node)) return;
      setTimePickerTaskIdx(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [timePickerTaskIdx]);

  function beginEdit(taskIdx: number, taskText: string) {
    skipBlurCommitRef.current = false;
    setEditingTaskIdx(taskIdx);
    setEditDraft(taskText);
  }

  function cancelEdit() {
    setEditingTaskIdx(null);
    setEditDraft("");
  }

  function commitEdit(taskIdx: number) {
    const task = tasks[taskIdx];
    if (!task) {
      cancelEdit();
      return;
    }

    const nextText = editDraft.trim();
    if (nextText !== task.taskText.trim()) {
      void onUpdateTaskText(taskIdx, nextText);
    }

    cancelEdit();
  }

  function openTimePicker(taskIdx: number, task: Task) {
    setTimePickerTaskIdx(taskIdx);
    setTimeStart(task.timeBlock?.start ?? "");
    setTimeEnd(task.timeBlock?.end ?? "");
  }

  function saveTimePicker() {
    if (timePickerTaskIdx === null) return;
    if (!timeStart || !timeEnd) return;

    void onSetTaskTimeBlock(timePickerTaskIdx, timeStart, timeEnd);
    setTimePickerTaskIdx(null);
  }

  function clearTimePicker() {
    if (timePickerTaskIdx === null) return;

    void onSetTaskTimeBlock(timePickerTaskIdx, null, null);
    setTimePickerTaskIdx(null);
  }

  return (
    <section className={styles.zone}>
      <p className={styles.label}>Active Task</p>
      {allDone ? (
        <p className={styles.allDone}>
          <CheckCircle size={14} weight="fill" />
          All done
        </p>
      ) : uncheckedRows.length > 0 ? (
        <div className={styles.taskList}>
          {uncheckedRows.map(({ task, idx }) => {
            const isEditing = editingTaskIdx === idx;
            const isActive = activeTaskIdx === idx;
            const isTimePickerOpen = timePickerTaskIdx === idx;
            const displayText = cleanTaskText(task.taskText) || task.taskText || "Untitled task";

            return (
              <div
                key={`${task.lineIndex}-${idx}`}
                className={`${styles.taskRow} ${isActive ? styles.taskRowActive : ""}`}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={false}
                  onChange={() => {
                    void onToggleTask(idx);
                  }}
                  aria-label="Mark task complete"
                />

                <div className={styles.taskBody}>
                  {isEditing ? (
                    <input
                      className={styles.inlineInput}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onBlur={() => {
                        if (skipBlurCommitRef.current) {
                          skipBlurCommitRef.current = false;
                          return;
                        }
                        commitEdit(idx);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEdit(idx);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          skipBlurCommitRef.current = true;
                          cancelEdit();
                        }
                      }}
                      autoFocus
                      spellCheck={false}
                    />
                  ) : (
                    <button
                      className={styles.taskTextButton}
                      onClick={() => beginEdit(idx, task.taskText)}
                    >
                      {displayText}
                    </button>
                  )}

                  <div className={styles.metaRow}>
                    {task.timeBlock ? (
                      <span className={styles.timeBadge}>
                        {task.timeBlock.start} - {task.timeBlock.end}
                      </span>
                    ) : (
                      <span className={styles.metaMuted}>No time block</span>
                    )}
                    {isActive && <span className={styles.activeBadge}>Now</span>}
                  </div>
                </div>

                <div className={styles.timeControls}>
                  <button
                    className={styles.timeButton}
                    onClick={() => openTimePicker(idx, task)}
                  >
                    {task.timeBlock ? "Edit" : "Time"}
                  </button>

                  {isTimePickerOpen && (
                    <div className={styles.timePopover} ref={timePopoverRef}>
                      <label className={styles.timeField}>
                        Start
                        <input
                          type="time"
                          value={timeStart}
                          onChange={(e) => setTimeStart(e.target.value)}
                        />
                      </label>
                      <label className={styles.timeField}>
                        End
                        <input
                          type="time"
                          value={timeEnd}
                          onChange={(e) => setTimeEnd(e.target.value)}
                        />
                      </label>
                      <div className={styles.timeActions}>
                        <button
                          className={styles.timeAction}
                          onClick={saveTimePicker}
                          disabled={!timeStart || !timeEnd}
                        >
                          Save
                        </button>
                        <button className={styles.timeAction} onClick={clearTimePicker}>
                          Clear
                        </button>
                        <button
                          className={styles.timeAction}
                          onClick={() => setTimePickerTaskIdx(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>No tasks in today's note</p>
      )}
    </section>
  );
}
