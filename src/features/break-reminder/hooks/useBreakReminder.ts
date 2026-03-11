import { useCallback, useEffect, useRef, useState } from "react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { PomodoroMode, PomodoroPhase } from "../../pomodoro/hooks/usePomodoro";
import type { BreakSettings } from "../../settings/hooks/useSettings";
import { DEFAULT_MESSAGES } from "../../settings/hooks/useSettings";

// ── Constants ─────────────────────────────────────────────────────────────────

const SNOOZE_DURATION = 5 * 60 * 1000; // 5 min — not user-configurable

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PomodoroStateSlice {
  mode: PomodoroMode;
  phase: PomodoroPhase;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBreakReminder(
  pomodoroState: PomodoroStateSlice,
  ifTimeTask: string,
  breakSettings?: BreakSettings
) {
  const [microBreakVisible, setMicroBreakVisible] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);

  const microTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMicroRef = useRef(false);
  const pendingLongRef = useRef(false);
  const wasFocusingRef = useRef(false);
  const ifTimeTaskRef = useRef(ifTimeTask);
  ifTimeTaskRef.current = ifTimeTask;
  const settingsRef = useRef(breakSettings);
  settingsRef.current = breakSettings;

  const isFocusing = pomodoroState.mode === "focus" && pomodoroState.phase === "running";

  // Resolved values from settings (with fallbacks)
  const microInterval   = (breakSettings?.microInterval   ?? 20) * 60 * 1000;
  const longInterval    = (breakSettings?.longInterval    ?? 90) * 60 * 1000;
  const microEnabled    = breakSettings?.microEnabled    ?? true;
  const longEnabled     = breakSettings?.longEnabled     ?? true;
  const longDuration    = breakSettings?.longDuration    ?? 5;

  // ── Long break window ──────────────────────────────────────────────────────

  const fireLongBreak = useCallback(() => {
    const task = ifTimeTaskRef.current;
    const dur  = settingsRef.current?.longDuration ?? 5;
    const base = import.meta.env.DEV ? "http://localhost:1420" : "index.html";
    const url  = `${base}?window=long-break&duration=${dur}${task ? `&task=${encodeURIComponent(task)}` : ""}`;

    try {
      const win = new WebviewWindow("long-break", {
        url,
        width: 800,
        height: 500,
        center: true,
        alwaysOnTop: true,
        decorations: false,
        title: "Take a Break",
        resizable: false,
      });
      win.once("tauri://error", (e) => {
        console.error("[break-reminder] long-break window error:", e);
      });
    } catch (e) {
      console.error("[break-reminder] failed to spawn long-break window:", e);
    }
  }, []);

  // ── Schedule helpers ───────────────────────────────────────────────────────

  const scheduleMicroRef = useRef<(delay?: number) => void>(() => {});
  const scheduleLongRef  = useRef<(delay?: number) => void>(() => {});

  const scheduleMicro = useCallback((delay?: number) => {
    const s = settingsRef.current;
    const interval = (s?.microInterval ?? 20) * 60 * 1000;
    const d = delay ?? interval;
    if (microTimerRef.current) clearTimeout(microTimerRef.current);
    microTimerRef.current = setTimeout(() => {
      if (wasFocusingRef.current) {
        pendingMicroRef.current = true;
      } else {
        setMessageIndex((i) => i + 1);
        setMicroBreakVisible(true);
      }
    }, d);
  }, []);
  scheduleMicroRef.current = scheduleMicro;

  const scheduleLong = useCallback((delay?: number) => {
    const s = settingsRef.current;
    const interval = (s?.longInterval ?? 90) * 60 * 1000;
    const d = delay ?? interval;
    if (longTimerRef.current) clearTimeout(longTimerRef.current);
    longTimerRef.current = setTimeout(() => {
      if (wasFocusingRef.current) {
        pendingLongRef.current = true;
      } else {
        fireLongBreak();
        scheduleLongRef.current(); // reschedule
      }
    }, d);
  }, [fireLongBreak]);
  scheduleLongRef.current = scheduleLong;

  // ── Init timers on mount ───────────────────────────────────────────────────

  useEffect(() => {
    if (microEnabled) scheduleMicro();
    if (longEnabled)  scheduleLong();
    return () => {
      if (microTimerRef.current) clearTimeout(microTimerRef.current);
      if (longTimerRef.current)  clearTimeout(longTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restart timers when settings change ───────────────────────────────────

  useEffect(() => {
    if (microTimerRef.current) clearTimeout(microTimerRef.current);
    if (microEnabled) scheduleMicro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microEnabled, microInterval]);

  useEffect(() => {
    if (longTimerRef.current) clearTimeout(longTimerRef.current);
    if (longEnabled) scheduleLong();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [longEnabled, longInterval, longDuration]);

  // ── React to Pomodoro state changes ───────────────────────────────────────

  useEffect(() => {
    const wasFocusing = wasFocusingRef.current;
    wasFocusingRef.current = isFocusing;

    if (wasFocusing && !isFocusing) {
      if (pendingMicroRef.current && microEnabled) {
        pendingMicroRef.current = false;
        setMessageIndex((i) => i + 1);
        setMicroBreakVisible(true);
      }
      if (pendingLongRef.current && longEnabled) {
        pendingLongRef.current = false;
        fireLongBreak();
        scheduleLong();
      }
    }
  }, [isFocusing, microEnabled, longEnabled, fireLongBreak, scheduleLong]);

  // ── Controls ───────────────────────────────────────────────────────────────

  const dismissMicro = useCallback(() => {
    setMicroBreakVisible(false);
    scheduleMicroRef.current();
  }, []);

  const snoozeMicro = useCallback(() => {
    setMicroBreakVisible(false);
    scheduleMicroRef.current(SNOOZE_DURATION);
  }, []);

  const messages = breakSettings?.messages?.length ? breakSettings.messages : DEFAULT_MESSAGES;

  return { microBreakVisible, messageIndex, messages, dismissMicro, snoozeMicro };
}
