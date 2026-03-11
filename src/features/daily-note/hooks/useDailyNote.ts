import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseNoteSections, type ParsedNote } from "../utils/sectionParser";
import {
  parseTasks,
  setTaskTimeBlock,
  toggleTask,
  updateTaskText,
  type Task,
} from "../../active-task/utils/taskParser";

interface NoteState extends ParsedNote {
  raw: string;
  loading: boolean;
  error: string | null;
  notFound: boolean;
}

const EMPTY: NoteState = {
  raw: "",
  frontmatter: {},
  preamble: "",
  sections: [],
  loading: false,
  error: null,
  notFound: false,
};

export function useDailyNote(notePath: string | null) {
  const [state, setState] = useState<NoteState>(EMPTY);
  // Keep a ref so callbacks always see the latest path without re-subscribing
  const notePathRef = useRef(notePath);
  notePathRef.current = notePath;

  const loadNote = useCallback(async (silent = false) => {
    const path = notePathRef.current;
    if (!path) {
      setState(EMPTY);
      return;
    }
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const raw = await invoke<string>("read_daily_note", { path });
      const parsed = parseNoteSections(raw);
      setState({ raw, ...parsed, loading: false, error: null, notFound: false });
    } catch (e) {
      const msg = String(e);
      setState((s) => ({
        ...s,
        loading: false,
        error: msg,
        notFound: msg.includes("No such file"),
      }));
    }
  }, []);

  // Reload when path changes
  useEffect(() => {
    loadNote();
  }, [notePath, loadNote]);

  // Listen for file-change events with 300ms debounce
  useEffect(() => {
    if (!notePath) return;
    let timeout: ReturnType<typeof setTimeout>;
    const unlistenPromise = listen("note-changed", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => loadNote(true), 300);
    });
    return () => {
      clearTimeout(timeout);
      unlistenPromise.then((fn) => fn());
    };
  }, [notePath, loadNote]);

  const tasks: Task[] = useMemo(() => parseTasks(state.raw), [state.raw]);

  const applyTaskMutation = useCallback(
    async (taskIdx: number, mutateRaw: (raw: string, lineIndex: number) => string) => {
      const path = notePathRef.current;
      const task = tasks[taskIdx];
      if (!path || !task) return;

      const newRaw = mutateRaw(state.raw, task.lineIndex);
      if (newRaw === state.raw) return;

      // Optimistic update — instant visual feedback
      const parsed = parseNoteSections(newRaw);
      setState({ raw: newRaw, ...parsed, loading: false, error: null, notFound: false });

      // Write to disk; file watcher will confirm on success
      try {
        await invoke("write_daily_note", { path, content: newRaw });
      } catch (e) {
        console.error("write_daily_note failed:", e);
        loadNote(); // roll back to on-disk state
      }
    },
    [tasks, state.raw, loadNote]
  );

  const toggleTaskAtIdx = useCallback(
    async (taskIdx: number) => {
      await applyTaskMutation(taskIdx, (raw, lineIndex) => toggleTask(raw, lineIndex));
    },
    [applyTaskMutation]
  );

  const updateTaskTextAtIdx = useCallback(
    async (taskIdx: number, newText: string) => {
      await applyTaskMutation(taskIdx, (raw, lineIndex) =>
        updateTaskText(raw, lineIndex, newText)
      );
    },
    [applyTaskMutation]
  );

  const setTaskTimeBlockAtIdx = useCallback(
    async (taskIdx: number, start: string | null, end: string | null) => {
      await applyTaskMutation(taskIdx, (raw, lineIndex) =>
        setTaskTimeBlock(raw, lineIndex, start, end)
      );
    },
    [applyTaskMutation]
  );

  const editTaskAtIdx = useCallback(
    async (taskIdx: number, newText: string, start: string | null, end: string | null) => {
      await applyTaskMutation(taskIdx, (raw, lineIndex) => {
        const withText = updateTaskText(raw, lineIndex, newText);
        return setTaskTimeBlock(withText, lineIndex, start, end);
      });
    },
    [applyTaskMutation]
  );

  return {
    ...state,
    tasks,
    toggleTask: toggleTaskAtIdx,
    updateTaskText: updateTaskTextAtIdx,
    setTaskTimeBlock: setTaskTimeBlockAtIdx,
    editTask: editTaskAtIdx,
    reload: loadNote,
  };
}
