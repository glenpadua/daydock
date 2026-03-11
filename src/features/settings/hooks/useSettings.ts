import { load, type Store } from "@tauri-apps/plugin-store";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_IF_TIME_SECTION_PATTERN } from "../utils/sectionPattern";

// ── Accent map ────────────────────────────────────────────────────────────────

export type AccentColor = "coral" | "amber" | "sage" | "sky";

export const ACCENT_MAP: Record<AccentColor, string> = {
  coral: "#e87040",
  amber: "#e8a040",
  sage:  "#7db87a",
  sky:   "#4da8d4",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PomodoroSettings {
  focus: number;      // minutes
  shortBreak: number;
  longBreak: number;
}

export interface BreakSettings {
  microEnabled: boolean;
  microInterval: number;  // minutes
  microDuration: number;  // seconds
  longEnabled: boolean;
  longInterval: number;   // minutes
  longDuration: number;   // minutes
  messages: string[];
}

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0–1
}

export interface Settings {
  // Vault
  vaultPath: string;
  dailyNotesFolder: string;
  filenameFormat: string;
  ifTimeSectionPattern: string;
  // Pomodoro
  pomodoro: PomodoroSettings;
  // Breaks
  breaks: BreakSettings;
  // Sounds
  sounds: SoundSettings;
  // Window
  opacity: number;       // 0.8–1.0
  alwaysOnTop: boolean;
  startAtLogin: boolean;
  // Appearance
  accentColor: AccentColor;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_MESSAGES = [
  "Look away from the screen 👀",
  "Roll your shoulders back",
  "Take 3 deep breaths",
  "Stand up and stretch",
  "Blink slowly a few times",
];

const DEFAULTS: Settings = {
  vaultPath: "",
  dailyNotesFolder: "Daily Notes",
  filenameFormat: "YYYY-MM-DD",
  ifTimeSectionPattern: DEFAULT_IF_TIME_SECTION_PATTERN,
  pomodoro: { focus: 25, shortBreak: 5, longBreak: 15 },
  breaks: {
    microEnabled: true, microInterval: 20, microDuration: 20,
    longEnabled:  true, longInterval:  90, longDuration:  5,
    messages: DEFAULT_MESSAGES,
  },
  sounds: { enabled: true, volume: 0.7 },
  opacity: 1.0,
  alwaysOnTop: true,
  startAtLogin: false,
  accentColor: "coral",
};

const STORE_FILE = "settings.json";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const storeRef = useRef<Store | null>(null);

  useEffect(() => {
    load(STORE_FILE, { defaults: {}, autoSave: true }).then(async (store) => {
      storeRef.current = store;

      const [
        vaultPath, dailyNotesFolder, filenameFormat, ifTimeSectionPattern,
        pomodoro, breaks, sounds,
        opacity, alwaysOnTop, startAtLoginStored, accentColor,
      ] = await Promise.all([
        store.get<string>("vaultPath"),
        store.get<string>("dailyNotesFolder"),
        store.get<string>("filenameFormat"),
        store.get<string>("ifTimeSectionPattern"),
        store.get<PomodoroSettings>("pomodoro"),
        store.get<BreakSettings>("breaks"),
        store.get<SoundSettings>("sounds"),
        store.get<number>("opacity"),
        store.get<boolean>("alwaysOnTop"),
        store.get<boolean>("startAtLogin"),
        store.get<AccentColor>("accentColor"),
      ]);

      // Reconcile startAtLogin with actual OS autostart state
      let actualStartAtLogin = startAtLoginStored ?? DEFAULTS.startAtLogin;
      try {
        actualStartAtLogin = await isEnabled();
      } catch {
        // Plugin may be unavailable in dev — fall back to stored value
      }

      setSettings({
        vaultPath:        vaultPath        ?? DEFAULTS.vaultPath,
        dailyNotesFolder: dailyNotesFolder ?? DEFAULTS.dailyNotesFolder,
        filenameFormat:   filenameFormat   ?? DEFAULTS.filenameFormat,
        ifTimeSectionPattern: ifTimeSectionPattern ?? DEFAULTS.ifTimeSectionPattern,
        pomodoro:         pomodoro         ?? DEFAULTS.pomodoro,
        breaks:           breaks           ?? DEFAULTS.breaks,
        sounds:           sounds           ?? DEFAULTS.sounds,
        opacity:          opacity          ?? DEFAULTS.opacity,
        alwaysOnTop:      alwaysOnTop      ?? DEFAULTS.alwaysOnTop,
        startAtLogin:     actualStartAtLogin,
        accentColor:      accentColor      ?? DEFAULTS.accentColor,
      });
      setReady(true);
    });
  }, []);

  // ── Side-effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready) return;
    document.documentElement.style.setProperty("--accent", ACCENT_MAP[settings.accentColor]);
  }, [ready, settings.accentColor]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.style.setProperty("opacity", String(settings.opacity));
  }, [ready, settings.opacity]);

  useEffect(() => {
    if (!ready) return;
    getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop).catch(() => {});
  }, [ready, settings.alwaysOnTop]);

  // ── Updater ───────────────────────────────────────────────────────────────────

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
    await storeRef.current?.set(key, value);

    // startAtLogin: sync with OS autostart
    if (key === "startAtLogin") {
      try {
        if (value) { await enable(); } else { await disable(); }
      } catch {
        // Not critical in dev
      }
    }
  }

  return { settings, updateSetting, ready };
}
