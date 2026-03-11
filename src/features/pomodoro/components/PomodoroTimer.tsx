import { Play, Pause, ArrowCounterClockwise, SkipForward } from "@phosphor-icons/react";
import type { PomodoroMode, PomodoroPhase } from "../hooks/usePomodoro";
import { ProgressRing } from "./ProgressRing";
import styles from "./PomodoroTimer.module.css";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  focus: "Focus",
  short_break: "Short Break",
  long_break: "Long Break",
};

const SESSION_COUNT = 4; // dots to display

interface PomodoroTimerProps {
  mode: PomodoroMode;
  phase: PomodoroPhase;
  remaining: number;
  progress: number;
  sessionCount: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skip: () => void;
}

export function PomodoroTimer({
  mode,
  phase,
  remaining,
  progress,
  sessionCount,
  start,
  pause,
  resume,
  reset,
  skip,
}: PomodoroTimerProps) {
  const isRunning = phase === "running";
  const isPaused = phase === "paused";
  const isIdle = phase === "idle";

  return (
    <div className={styles.timer}>
      <p className={`${styles.modeLabel} ${styles[mode]}`}>{MODE_LABELS[mode]}</p>

      <div className={styles.ringWrap}>
        <ProgressRing progress={progress} mode={mode} size={120} strokeWidth={3}>
          <span className={`${styles.timeDisplay} ${styles[mode]}`}>
            {formatTime(remaining)}
          </span>
        </ProgressRing>
      </div>

      {/* Session dots — light up within each set of 4 */}
      <div className={styles.dots}>
        {Array.from({ length: SESSION_COUNT }, (_, i) => {
          const pos = sessionCount % SESSION_COUNT;
          const filled = sessionCount > 0 && (pos === 0 || i < pos);
          return (
            <span
              key={i}
              className={`${styles.dot} ${filled ? styles.dotFilled : ""}`}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {isIdle && (
          <button className={styles.btnPrimary} onClick={start} aria-label="Start">
            <Play size={16} weight="fill" />
          </button>
        )}
        {isRunning && (
          <button className={styles.btnSecondary} onClick={pause} aria-label="Pause">
            <Pause size={16} />
          </button>
        )}
        {isPaused && (
          <>
            <button className={styles.btnPrimary} onClick={resume} aria-label="Resume">
              <Play size={16} weight="fill" />
            </button>
            <button className={styles.btnGhost} onClick={reset} aria-label="Reset">
              <ArrowCounterClockwise size={14} />
            </button>
          </>
        )}
        {(isRunning || isPaused) && (
          <button className={styles.btnGhost} onClick={skip} aria-label="Skip">
            <SkipForward size={14} />
          </button>
        )}
        {isIdle && (
          <button className={styles.btnGhost} onClick={reset} aria-label="Reset">
            <ArrowCounterClockwise size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
