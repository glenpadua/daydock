import { useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { CaretLeft, CaretRight, GearSix, X } from "@phosphor-icons/react";
import styles from "./Header.module.css";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

type SizePreset = "compact" | "small" | "medium";

const SIZE_MAP: Record<SizePreset, number> = {
  compact: 56,
  small: 360,
  medium: 680,
};

interface HeaderProps {
  onOpenSettings: () => void;
  selectedDate: Date;
  isToday: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDate: (date: Date) => void;
}

export default function Header({
  onOpenSettings,
  selectedDate,
  isToday,
  onPrevDay,
  onNextDay,
  onSelectDate,
}: HeaderProps) {
  const [activeSize, setActiveSize] = useState<SizePreset>("medium");
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = () => getCurrentWindow().close();

  async function resize(preset: SizePreset) {
    setActiveSize(preset);
    await getCurrentWindow().setSize(new LogicalSize(340, SIZE_MAP[preset]));
  }

  return (
    <header className={styles.header} data-tauri-drag-region>
      <div className={styles.dateNav}>
        <button className={styles.navBtn} onClick={onPrevDay} aria-label="Previous day">
          <CaretLeft size={12} weight="bold" />
        </button>

        <button
          className={`${styles.dateBtn} ${!isToday ? styles.dateBtnPast : ""}`}
          onClick={() => {
            const input = dateInputRef.current;
            if (!input) return;

            input.showPicker?.();
            input.focus();
            input.click();
          }}
        >
          {formatDate(selectedDate)}
        </button>

        <input
          ref={dateInputRef}
          type="date"
          className={styles.hiddenDateInput}
          value={toInputValue(selectedDate)}
          max={toInputValue(new Date())}
          onChange={(e) => {
            if (e.target.value) onSelectDate(fromInputValue(e.target.value));
          }}
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          className={styles.navBtn}
          onClick={onNextDay}
          disabled={isToday}
          aria-label="Next day"
        >
          <CaretRight size={12} weight="bold" />
        </button>
      </div>

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
