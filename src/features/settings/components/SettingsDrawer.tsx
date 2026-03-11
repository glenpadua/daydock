import { X, Plus } from "@phosphor-icons/react";
import type { Settings, AccentColor } from "../hooks/useSettings";
import { ACCENT_MAP, DEFAULT_MESSAGES } from "../hooks/useSettings";
import { VaultPathPicker } from "./VaultPathPicker";
import styles from "./SettingsDrawer.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function SettingsDrawer({ open, onClose, settings, updateSetting }: Props) {
  if (!open) return null;

  const { pomodoro, breaks, sounds } = settings;
  const messages = breaks.messages?.length ? breaks.messages : DEFAULT_MESSAGES;

  function updatePomodoro(partial: Partial<Settings["pomodoro"]>) {
    updateSetting("pomodoro", { ...pomodoro, ...partial });
  }

  function updateBreaks(partial: Partial<Settings["breaks"]>) {
    updateSetting("breaks", { ...breaks, ...partial });
  }

  function updateSounds(partial: Partial<Settings["sounds"]>) {
    updateSetting("sounds", { ...sounds, ...partial });
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Settings</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <X size={14} />
          </button>
        </div>

        <div className={styles.content}>

          {/* ── Vault ──────────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Vault</p>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Vault folder</label>
              <VaultPathPicker
                vaultPath={settings.vaultPath}
                onSaveVaultPath={(p) => updateSetting("vaultPath", p)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Daily notes folder</label>
              <input
                className={styles.textInput}
                value={settings.dailyNotesFolder}
                onChange={(e) => updateSetting("dailyNotesFolder", e.target.value)}
                placeholder="Daily Notes"
                spellCheck={false}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Filename format</label>
              <input
                className={styles.textInput}
                value={settings.filenameFormat}
                onChange={(e) => updateSetting("filenameFormat", e.target.value)}
                placeholder="YYYY-MM-DD"
                spellCheck={false}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>If-time section pattern (regex)</label>
              <input
                className={styles.textInput}
                value={settings.ifTimeSectionPattern}
                onChange={(e) => updateSetting("ifTimeSectionPattern", e.target.value)}
                placeholder="if time"
                spellCheck={false}
              />
            </div>
          </section>

          {/* ── Pomodoro ───────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Pomodoro</p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Focus</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={pomodoro.focus}
                  min={1}
                  max={120}
                  onChange={(e) =>
                    updatePomodoro({ focus: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Short break</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={pomodoro.shortBreak}
                  min={1}
                  max={60}
                  onChange={(e) =>
                    updatePomodoro({ shortBreak: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Long break</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={pomodoro.longBreak}
                  min={1}
                  max={120}
                  onChange={(e) =>
                    updatePomodoro({ longBreak: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>
          </section>

          {/* ── Breaks ─────────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Breaks</p>

            <p className={styles.subsectionTitle}>Micro-break</p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Enabled</span>
              <button
                className={`${styles.toggle} ${breaks.microEnabled ? styles.toggleOn : ""}`}
                onClick={() => updateBreaks({ microEnabled: !breaks.microEnabled })}
                role="switch"
                aria-checked={breaks.microEnabled}
              />
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Every</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={breaks.microInterval}
                  min={1}
                  max={120}
                  disabled={!breaks.microEnabled}
                  onChange={(e) =>
                    updateBreaks({ microInterval: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Duration</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={breaks.microDuration}
                  min={5}
                  max={300}
                  disabled={!breaks.microEnabled}
                  onChange={(e) =>
                    updateBreaks({ microDuration: Math.max(5, parseInt(e.target.value) || 5) })
                  }
                />
                <span className={styles.unit}>sec</span>
              </div>
            </div>

            <p className={styles.subsectionTitle} style={{ marginTop: "var(--space-3)" }}>
              Long break
            </p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Enabled</span>
              <button
                className={`${styles.toggle} ${breaks.longEnabled ? styles.toggleOn : ""}`}
                onClick={() => updateBreaks({ longEnabled: !breaks.longEnabled })}
                role="switch"
                aria-checked={breaks.longEnabled}
              />
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Every</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={breaks.longInterval}
                  min={1}
                  max={480}
                  disabled={!breaks.longEnabled}
                  onChange={(e) =>
                    updateBreaks({ longInterval: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Duration</span>
              <div className={styles.numGroup}>
                <input
                  type="number"
                  className={styles.numInput}
                  value={breaks.longDuration}
                  min={1}
                  max={60}
                  disabled={!breaks.longEnabled}
                  onChange={(e) =>
                    updateBreaks({ longDuration: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                />
                <span className={styles.unit}>min</span>
              </div>
            </div>

            <p className={styles.subsectionTitle} style={{ marginTop: "var(--space-3)" }}>
              Reminder messages
            </p>

            <div className={styles.messageList}>
              {messages.map((msg, i) => (
                <div key={i} className={styles.messageItem}>
                  <input
                    className={styles.messageInput}
                    value={msg}
                    onChange={(e) => {
                      const next = [...messages];
                      next[i] = e.target.value;
                      updateBreaks({ messages: next });
                    }}
                    spellCheck={false}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() =>
                      updateBreaks({ messages: messages.filter((_, j) => j !== i) })
                    }
                    aria-label="Remove message"
                    disabled={messages.length <= 1}
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                className={styles.addBtn}
                onClick={() => updateBreaks({ messages: [...messages, ""] })}
              >
                <Plus size={12} /> Add message
              </button>
            </div>
          </section>

          {/* ── Sounds ─────────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Sounds</p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Enabled</span>
              <button
                className={`${styles.toggle} ${sounds.enabled ? styles.toggleOn : ""}`}
                onClick={() => updateSounds({ enabled: !sounds.enabled })}
                role="switch"
                aria-checked={sounds.enabled}
              />
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Volume</span>
              <input
                type="range"
                className={styles.slider}
                min={0}
                max={100}
                value={Math.round(sounds.volume * 100)}
                disabled={!sounds.enabled}
                onChange={(e) =>
                  updateSounds({ volume: parseInt(e.target.value) / 100 })
                }
              />
              <span className={styles.sliderValue}>
                {Math.round(sounds.volume * 100)}%
              </span>
            </div>
          </section>

          {/* ── Window ─────────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Window</p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Opacity</span>
              <input
                type="range"
                className={styles.slider}
                min={80}
                max={100}
                value={Math.round(settings.opacity * 100)}
                onChange={(e) =>
                  updateSetting("opacity", parseInt(e.target.value) / 100)
                }
              />
              <span className={styles.sliderValue}>
                {Math.round(settings.opacity * 100)}%
              </span>
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Always on top</span>
              <button
                className={`${styles.toggle} ${settings.alwaysOnTop ? styles.toggleOn : ""}`}
                onClick={() => updateSetting("alwaysOnTop", !settings.alwaysOnTop)}
                role="switch"
                aria-checked={settings.alwaysOnTop}
              />
            </div>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Start at login</span>
              <button
                className={`${styles.toggle} ${settings.startAtLogin ? styles.toggleOn : ""}`}
                onClick={() => updateSetting("startAtLogin", !settings.startAtLogin)}
                role="switch"
                aria-checked={settings.startAtLogin}
              />
            </div>
          </section>

          {/* ── Appearance ─────────────────────────────────── */}
          <section className={styles.section}>
            <p className={styles.sectionTitle}>Appearance</p>

            <div className={styles.row}>
              <span className={styles.rowLabel}>Accent color</span>
              <div className={styles.swatchRow}>
                {(Object.keys(ACCENT_MAP) as AccentColor[]).map((color) => (
                  <button
                    key={color}
                    className={`${styles.swatch} ${
                      settings.accentColor === color ? styles.swatchActive : ""
                    }`}
                    style={{ background: ACCENT_MAP[color] }}
                    onClick={() => updateSetting("accentColor", color)}
                    title={color.charAt(0).toUpperCase() + color.slice(1)}
                    aria-label={color}
                    aria-pressed={settings.accentColor === color}
                  />
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
