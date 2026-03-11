import { useEffect, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import styles from "./MicroBreakOverlay.module.css";

interface MicroBreakOverlayProps {
  messageIndex: number;
  messages: string[];
  autoDismissMs: number;
  onSnooze: () => void;
  onDismiss: () => void;
}

export function MicroBreakOverlay({
  messageIndex,
  messages,
  autoDismissMs,
  onSnooze,
  onDismiss,
}: MicroBreakOverlayProps) {
  const message = messages[messageIndex % messages.length];
  const [hiding, setHiding] = useState(false);
  const dismissedRef = useRef(false);

  const triggerDismiss = (callback: () => void) => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setHiding(true);
    setTimeout(callback, 250); // match slideOut duration
  };

  // Auto-dismiss after autoDismissMs
  useEffect(() => {
    dismissedRef.current = false;
    setHiding(false);
    const timer = setTimeout(() => triggerDismiss(onDismiss), autoDismissMs);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageIndex, autoDismissMs]);

  const countdownSeconds = Math.round(autoDismissMs / 1000);

  return (
    <div className={`${styles.overlay} ${hiding ? styles.hiding : styles.visible}`}>
      <div className={styles.progressTrack}>
        <div
          className={styles.progressBar}
          key={`${messageIndex}-${autoDismissMs}`}
          style={{ "--countdown-duration": `${countdownSeconds}s` } as React.CSSProperties}
        />
      </div>
      <div className={styles.inner}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            className={styles.snoozeBtn}
            onClick={() => triggerDismiss(onSnooze)}
          >
            Snooze 5 min
          </button>
          <button
            className={styles.dismissBtn}
            onClick={() => triggerDismiss(onDismiss)}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
