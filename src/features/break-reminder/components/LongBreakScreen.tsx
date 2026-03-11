import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import styles from "./LongBreakScreen.module.css";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LongBreakScreen() {
  const params = new URLSearchParams(window.location.search);
  const taskText = params.get("task") ?? "";
  const breakDuration = parseInt(params.get("duration") ?? "5") * 60;

  const [remaining, setRemaining] = useState(breakDuration);
  const startedAtRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeWindow = async () => {
    try {
      await getCurrentWindow().close();
    } catch (e) {
      console.error("[LongBreakScreen] close failed:", e);
    }
  };

  useEffect(() => {
    startedAtRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
      const newRemaining = Math.max(0, breakDuration - elapsed);
      setRemaining(newRemaining);

      if (newRemaining === 0) {
        clearInterval(intervalRef.current!);
        closeWindow();
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <p className={styles.label}>Long Break</p>
        <p className={styles.countdown}>{formatTime(remaining)}</p>

        {taskText && (
          <div className={styles.task}>
            <span className={styles.taskLabel}>Something to consider</span>
            {taskText}
          </div>
        )}

        <button className={styles.btn} onClick={closeWindow}>
          I'm back
        </button>
      </div>
    </div>
  );
}
