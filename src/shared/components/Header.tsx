import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { GearSix, X } from "@phosphor-icons/react";
import styles from "./Header.module.css";

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

type SizePreset = "compact" | "small" | "medium";

const SIZE_MAP: Record<SizePreset, number> = {
  compact: 56,
  small: 360,
  medium: 680,
};

interface HeaderProps {
  onOpenSettings: () => void;
}

export default function Header({ onOpenSettings }: HeaderProps) {
  const [activeSize, setActiveSize] = useState<SizePreset>("medium");

  const handleClose = () => getCurrentWindow().close();

  async function resize(preset: SizePreset) {
    setActiveSize(preset);
    await getCurrentWindow().setSize(new LogicalSize(340, SIZE_MAP[preset]));
  }

  return (
    <header className={styles.header} data-tauri-drag-region>
      <span className={styles.date}>{formatDate()}</span>
      <div className={styles.controls}>
        <div className={styles.sizePresets}>
          <button
            className={`${styles.sizeBtn} ${activeSize === "compact" ? styles.sizeBtnActive : ""}`}
            onClick={() => resize("compact")}
            title="Compact"
            aria-label="Compact view"
          >
            —
          </button>
          <button
            className={`${styles.sizeBtn} ${activeSize === "small" ? styles.sizeBtnActive : ""}`}
            onClick={() => resize("small")}
            title="Small"
            aria-label="Small view"
          >
            ▫
          </button>
          <button
            className={`${styles.sizeBtn} ${activeSize === "medium" ? styles.sizeBtnActive : ""}`}
            onClick={() => resize("medium")}
            title="Medium"
            aria-label="Medium view"
          >
            ▪
          </button>
        </div>
        <button
          className={styles.btn}
          title="Settings"
          aria-label="Settings"
          onClick={onOpenSettings}
        >
          <GearSix size={14} />
        </button>
        <button
          className={styles.btn}
          onClick={handleClose}
          title="Close"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
}
