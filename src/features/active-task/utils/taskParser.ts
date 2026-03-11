export interface TimeBlock {
  start: string;
  end: string;
  startMinutes: number;
  endMinutes: number;
}

export interface Task {
  lineIndex: number; // 0-based line number in the raw file
  checked: boolean;
  text: string; // raw markdown text of the task, includes time block if present
  taskText: string; // markdown text after stripping a time block prefix
  timeBlock: TimeBlock | null;
}

interface TaskLineMatch {
  prefix: string;
  text: string;
}

interface ParsedTaskText {
  taskText: string;
  timeBlock: TimeBlock | null;
  rawPrefix: string;
}

const TASK_PATTERN = /^(\s*[-*+]\s*)\[([ xX])\]\s*(.*)$/;
const TASK_LINE_PATTERN = /^(\s*[-*+]\s*\[[ xX]\]\s*)(.*)$/;
const TIME_BLOCK_PATTERN = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*→\s*(.*)$/;

function parseTaskLine(line: string): TaskLineMatch | null {
  const match = line.match(TASK_LINE_PATTERN);
  if (!match) return null;
  return { prefix: match[1], text: match[2] };
}

function parseClockToMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function normalizeTime(value: string): string | null {
  const minutes = parseClockToMinutes(value);
  if (minutes === null) return null;

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseTaskText(text: string): ParsedTaskText {
  const match = text.match(TIME_BLOCK_PATTERN);
  if (!match) {
    return { taskText: text, timeBlock: null, rawPrefix: "" };
  }

  const normalizedStart = normalizeTime(match[1]);
  const normalizedEnd = normalizeTime(match[2]);
  if (!normalizedStart || !normalizedEnd) {
    return { taskText: text, timeBlock: null, rawPrefix: "" };
  }

  const startMinutes = parseClockToMinutes(normalizedStart);
  const endMinutes = parseClockToMinutes(normalizedEnd);
  if (startMinutes === null || endMinutes === null) {
    return { taskText: text, timeBlock: null, rawPrefix: "" };
  }

  const taskText = match[3];
  const rawPrefix = text.slice(0, text.length - taskText.length);

  return {
    taskText,
    rawPrefix,
    timeBlock: {
      start: normalizedStart,
      end: normalizedEnd,
      startMinutes,
      endMinutes,
    },
  };
}

export function formatTimeBlockPrefix(start: string, end: string): string | null {
  const normalizedStart = normalizeTime(start);
  const normalizedEnd = normalizeTime(end);
  if (!normalizedStart || !normalizedEnd) return null;
  return `${normalizedStart} - ${normalizedEnd} → `;
}

export function parseTasks(raw: string): Task[] {
  return raw
    .split("\n")
    .map((line, i) => {
      const m = line.match(TASK_PATTERN);
      if (!m) return null;

      const parsed = parseTaskText(m[3]);
      return {
        lineIndex: i,
        checked: m[2].toLowerCase() === "x",
        text: m[3],
        taskText: parsed.taskText,
        timeBlock: parsed.timeBlock,
      };
    })
    .filter((t): t is Task => t !== null);
}

function replaceTaskText(
  raw: string,
  lineIndex: number,
  replace: (taskText: string, parsed: ParsedTaskText) => string
): string {
  const lines = raw.split("\n");
  const current = lines[lineIndex];
  if (current === undefined) return raw;

  const match = parseTaskLine(current);
  if (!match) return raw;

  const parsed = parseTaskText(match.text);
  const nextTaskText = replace(parsed.taskText, parsed).trim();

  lines[lineIndex] = `${match.prefix}${nextTaskText}`;
  return lines.join("\n");
}

export function toggleTask(raw: string, lineIndex: number): string {
  const lines = raw.split("\n");
  if (lines[lineIndex] === undefined) return raw;

  lines[lineIndex] = lines[lineIndex].replace(
    /\[([ xX])\]/,
    (_, c) => (c === " " ? "[x]" : "[ ]")
  );
  return lines.join("\n");
}

export function updateTaskText(raw: string, lineIndex: number, newText: string): string {
  return replaceTaskText(raw, lineIndex, (_, parsed) => {
    const trimmedText = newText.trim();
    if (!parsed.timeBlock) return trimmedText;

    return `${parsed.rawPrefix}${trimmedText}`;
  });
}

export function setTaskTimeBlock(
  raw: string,
  lineIndex: number,
  start: string | null,
  end: string | null
): string {
  return replaceTaskText(raw, lineIndex, (taskText) => {
    const hasRange = Boolean(start && end);
    if (!hasRange) return taskText;

    const prefix = formatTimeBlockPrefix(start!, end!);
    if (!prefix) return taskText;

    return `${prefix}${taskText}`;
  });
}

export function findActiveTaskIndex(tasks: Task[], now = new Date()): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  for (let idx = 0; idx < tasks.length; idx += 1) {
    const task = tasks[idx];
    if (task.checked || !task.timeBlock) continue;
    const { startMinutes, endMinutes } = task.timeBlock;
    if (endMinutes <= startMinutes) continue;
    if (nowMinutes >= startMinutes && nowMinutes < endMinutes) return idx;
  }

  return tasks.findIndex((task) => !task.checked);
}

/** Strip wikilinks, tags, and bold markers for plain display */
export function cleanTaskText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, page, alias) => alias ?? page)
    .replace(/#[a-zA-Z][a-zA-Z0-9/_-]*/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
}
