
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { Store } from "@tauri-apps/plugin-store";
import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PomodoroSettings } from "../../settings/hooks/useSettings";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PomodoroMode = "focus" | "short_break" | "long_break";
export type PomodoroPhase = "idle" | "running" | "paused";

export interface PomodoroState {
  mode: PomodoroMode;
  phase: PomodoroPhase;
  remaining: number; // seconds
  sessionCount: number; // focus sessions completed today
  durations: Record<PomodoroMode, number>; // seconds, configurable
}

type Action =
  | { type: "START" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "RESET" }
  | { type: "SKIP" }
  | { type: "COMPLETE" }
  | { type: "TICK"; remaining: number }
  | { type: "SET_SESSION_COUNT"; count: number }
  | { type: "SET_DURATIONS"; durations: Record<PomodoroMode, number> };

// ── Default durations (seconds) ───────────────────────────────────────────────

const DEFAULT_DURATIONS: Record<PomodoroMode, number> = {
  focus:       25 * 60,
  short_break:  5 * 60,
  long_break:  15 * 60,
};

function toDurations(s?: PomodoroSettings): Record<PomodoroMode, number> {
  if (!s) return DEFAULT_DURATIONS;
  return {
    focus:       (s.focus      ?? 25) * 60,
    short_break: (s.shortBreak ??  5) * 60,
    long_break:  (s.longBreak  ?? 15) * 60,
  };
}

function nextMode(mode: PomodoroMode, sessionCount: number): PomodoroMode {
  if (mode !== "focus") return "focus";
  return (sessionCount + 1) % 4 === 0 ? "long_break" : "short_break";
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: PomodoroState, action: Action): PomodoroState {
  switch (action.type) {
    case "START":
      return { ...state, phase: "running" };

    case "PAUSE":
      return { ...state, phase: "paused" };

    case "RESUME":
      return { ...state, phase: "running" };

    case "RESET":
      return { ...state, phase: "idle", remaining: state.durations[state.mode] };

    case "SKIP": {
      const next = nextMode(state.mode, state.sessionCount);
      return { ...state, mode: next, phase: "idle", remaining: state.durations[next] };
    }

    case "COMPLETE": {
      const newCount =
        state.mode === "focus" ? state.sessionCount + 1 : state.sessionCount;
      const next = nextMode(state.mode, newCount);
      return { ...state, mode: next, phase: "idle", remaining: state.durations[next], sessionCount: newCount };
    }

    case "TICK":
      return { ...state, remaining: action.remaining };

    case "SET_SESSION_COUNT":
      return { ...state, sessionCount: action.count };

    case "SET_DURATIONS": {
      const d = action.durations;
      // If idle, snap remaining to the new duration for the current mode
      const remaining = state.phase === "idle" ? d[state.mode] : state.remaining;
      return { ...state, durations: d, remaining };
    }

    default:
      return state;
  }
}

// ── Notification ──────────────────────────────────────────────────────────────

async function notify(title: string, body: string) {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (granted) {
      sendNotification({ title, body });
    } else {
      console.warn("[notify] permission not granted");
    }
  } catch (e) {
    console.error("[notify] failed:", e);
  }
}

function notifyComplete(completedMode: PomodoroMode, nextMode: PomodoroMode) {
  if (completedMode === "focus") {
    const isLong = nextMode === "long_break";
    notify(
      "Focus session complete",
      isLong ? "Time for a long break — you've earned it." : "Time for a short break."
    );
  } else {
    notify("Break over", "Ready to focus again?");
  }
}

// ── Store persistence ─────────────────────────────────────────────────────────

const STORE_PATH = "settings.json";

async function loadTodayCount(): Promise<number> {
  try {
    const store = await Store.load(STORE_PATH);
    const today = new Date().toISOString().slice(0, 10);
    const date = await store.get<string>("pomodoroDate");
    if (date !== today) return 0;
    return (await store.get<number>("pomodoroCount")) ?? 0;
  } catch {
    return 0;
  }
}

async function saveTodayCount(count: number) {
  try {
    const store = await Store.load(STORE_PATH);
    const today = new Date().toISOString().slice(0, 10);
    await store.set("pomodoroDate", today);
    await store.set("pomodoroCount", count);
    await store.save();
  } catch {
    // Not critical
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePomodoro(customDurations?: PomodoroSettings) {
  const initialDurations = toDurations(customDurations);

  const [state, dispatch] = useReducer(reducer, {
    mode: "focus",
    phase: "idle",
    remaining: initialDurations.focus,
    sessionCount: 0,
    durations: initialDurations,
  } satisfies PomodoroState);

  // Drift-corrected timer refs
  const startedAtRef = useRef<number>(0);
  const remainingAtStartRef = useRef<number>(initialDurations.focus);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted session count on mount
  useEffect(() => {
    loadTodayCount().then((count) => {
      dispatch({ type: "SET_SESSION_COUNT", count });
    });
  }, []);

  // Sync custom durations from settings
  useEffect(() => {
    dispatch({ type: "SET_DURATIONS", durations: toDurations(customDurations) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customDurations?.focus, customDurations?.shortBreak, customDurations?.longBreak]);

  // Drift-corrected tick
  useEffect(() => {
    if (state.phase !== "running") {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    startedAtRef.current = Date.now();
    remainingAtStartRef.current = state.remaining;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAtRef.current) / 1000);
      const newRemaining = Math.max(0, remainingAtStartRef.current - elapsed);
      dispatch({ type: "TICK", remaining: newRemaining });

      if (newRemaining === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        const next = nextMode(state.mode, state.sessionCount + (state.mode === "focus" ? 1 : 0));
        notifyComplete(state.mode, next);
        dispatch({ type: "COMPLETE" });

        if (state.mode === "focus") {
          const newCount = state.sessionCount + 1;
          saveTodayCount(newCount);
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.mode]);

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE" }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const skip = useCallback(() => dispatch({ type: "SKIP" }), []);

  const progress = 1 - state.remaining / state.durations[state.mode];

  return { ...state, progress, start, pause, resume, reset, skip };
}
