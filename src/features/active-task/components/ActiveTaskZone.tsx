import { useEffect, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { CheckCircle } from "@phosphor-icons/react";
import type { Task } from "../utils/taskParser";
import { cleanTaskText, findActiveTaskIndex } from "../utils/taskParser";
import styles from "./ActiveTaskZone.module.css";

interface Props {
  tasks: Task[];
}

export function ActiveTaskZone({ tasks }: Props) {
  const activeTaskIdx = useMemo(() => {
    const idx = findActiveTaskIndex(tasks);
    return idx >= 0 ? idx : null;
  }, [tasks]);
  const activeTask = activeTaskIdx === null ? null : tasks[activeTaskIdx];
  const allDone = tasks.length > 0 && tasks.every((t) => t.checked);

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

  return (
    <section className={styles.zone}>
      <p className={styles.label}>Active Task</p>
      {allDone ? (
        <p className={styles.allDone}>
          <CheckCircle size={14} weight="fill" />
          All done
        </p>
      ) : activeTask ? (
        <>
          <p className={styles.taskText}>
            {cleanTaskText(activeTask.taskText) || activeTask.taskText || "Untitled task"}
          </p>
          {activeTask.timeBlock && (
            <p className={styles.timeLabel}>
              {activeTask.timeBlock.start} - {activeTask.timeBlock.end}
            </p>
          )}
        </>
      ) : (
        <p className={styles.empty}>No tasks in today's note</p>
      )}
    </section>
  );
}
