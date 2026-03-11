import { useEffect, useRef, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { NoteSection } from "../utils/sectionParser";
import { parseMarkdown } from "../utils/markdownParser";
import type { Task } from "../../active-task/utils/taskParser";
import styles from "./NoteRenderer.module.css";

interface Props {
  preamble: string;
  sections: NoteSection[];
  tasks: Task[];
  onToggleTask: (taskIdx: number) => void;
  onEditTask: (
    taskIdx: number,
    newText: string,
    start: string | null,
    end: string | null
  ) => void | Promise<void>;
  vaultName?: string;
  vaultPath?: string;
  notePath?: string | null;
}

interface TaskEditorState {
  taskIdx: number;
  draftText: string;
  start: string;
  end: string;
  top: number;
  left: number;
  width: number;
  minHeight: number;
}

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function normalizePath(path: string): string {
  const isAbsolute = path.startsWith("/");
  const segments = path.split("/").reduce<string[]>((parts, segment) => {
    if (!segment || segment === ".") return parts;
    if (segment === "..") {
      if (parts.length > 0) parts.pop();
      return parts;
    }
    parts.push(segment);
    return parts;
  }, []);

  return `${isAbsolute ? "/" : ""}${segments.join("/")}`;
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : normalized.slice(0, lastSlash);
}

function toVaultRelativePath(path: string, vaultPath?: string): string | null {
  if (!vaultPath) return null;
  const normalizedVault = normalizePath(vaultPath).replace(/\/$/, "");
  const normalizedPath = normalizePath(path);

  if (normalizedPath === normalizedVault) return "";
  if (!normalizedPath.startsWith(`${normalizedVault}/`)) return null;

  return normalizedPath.slice(normalizedVault.length + 1);
}

function stripNoteExtension(path: string): string {
  return path.replace(/\.md$/i, "");
}

function resolveInternalNoteTarget(
  href: string,
  notePath?: string | null,
  vaultPath?: string
): string | null {
  const [rawPath] = href.split("#");
  const decodedPath = decodeURIComponent(rawPath).trim();
  if (!decodedPath || URL_SCHEME_PATTERN.test(decodedPath)) return null;

  const relativePath = decodedPath.startsWith("/")
    ? decodedPath.slice(1)
    : notePath && vaultPath
      ? toVaultRelativePath(`${dirname(notePath)}/${decodedPath}`, vaultPath)
      : decodedPath;

  if (!relativePath) return null;

  return stripNoteExtension(normalizePath(relativePath));
}

function buildObsidianUrl(vaultName: string, target: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(target)}`;
}

function isExternalUrl(href: string): boolean {
  return /^(https?:|mailto:|tel:)/i.test(href.trim());
}

export function NoteRenderer({
  preamble,
  sections,
  tasks,
  onToggleTask,
  onEditTask,
  vaultName,
  vaultPath,
  notePath,
}: Props) {
  const [editor, setEditor] = useState<TaskEditorState | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    function handleOutsideClick(event: MouseEvent) {
      if (editorRef.current?.contains(event.target as Node)) return;
      setEditor(null);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const task = tasks[editor.taskIdx];
    if (!task || task.checked) {
      setEditor(null);
    }
  }, [editor, tasks]);

  useEffect(() => {
    if (!editor || !textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(editor.minHeight, textarea.scrollHeight)}px`;
  }, [editor]);

  function openTaskEditor(taskIdx: number, anchorRect: DOMRect) {
    const task = tasks[taskIdx];
    if (!task || task.checked) return;

    setEditor({
      taskIdx,
      draftText: task.taskText,
      start: task.timeBlock?.start ?? "",
      end: task.timeBlock?.end ?? "",
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      minHeight: Math.max(anchorRect.height, 72),
    });
  }

  function updateEditor(partial: Partial<TaskEditorState>) {
    setEditor((current) => (current ? { ...current, ...partial } : current));
  }

  async function saveTaskEditor() {
    if (!editor) return;
    const newText = editor.draftText.trim();
    const start = editor.start.trim();
    const end = editor.end.trim();
    const hasPartialTime = Boolean((start && !end) || (!start && end));
    if (hasPartialTime) return;

    await onEditTask(editor.taskIdx, newText, start || null, end || null);
    setEditor(null);
  }

  // Render preamble first, track its task count so section indices are correct
  const preambleResult = preamble ? parseMarkdown(preamble, 0) : null;
  let cumulativeTaskIdx = preambleResult?.taskCount ?? 0;
  const hasAnyContent = Boolean((preamble ?? "").trim()) || sections.some(
    (section) => section.title.trim() || section.content.trim()
  );

  return (
    <div className={styles.note}>
      {!hasAnyContent && (
        <p className={styles.emptyNote}>Today&apos;s note is empty.</p>
      )}
      {preambleResult && (
        <ContentBlock
          html={preambleResult.html}
          onToggleTask={onToggleTask}
          onRequestEditTask={openTaskEditor}
          vaultName={vaultName}
          vaultPath={vaultPath}
          notePath={notePath}
        />
      )}
      {sections.map((section, i) => {
        const startIdx = cumulativeTaskIdx;
        const result = parseMarkdown(section.content, startIdx);
        cumulativeTaskIdx += result.taskCount;

        return (
          <SectionBlock
            key={`${section.title}-${i}`}
            section={section}
            html={result.html}
            onToggleTask={onToggleTask}
            onRequestEditTask={openTaskEditor}
            vaultName={vaultName}
            vaultPath={vaultPath}
            notePath={notePath}
          />
        );
      })}

      {editor && (
        <div
          ref={editorRef}
          className={styles.taskEditor}
          style={{ top: editor.top, left: editor.left, width: editor.width }}
        >
          <textarea
            ref={textareaRef}
            className={styles.editorTextarea}
            value={editor.draftText}
            onChange={(e) => updateEditor({ draftText: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                setEditor(null);
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void saveTaskEditor();
              }
            }}
            spellCheck={false}
            autoFocus
          />

          <div className={styles.timeRow}>
            <label className={styles.timeField}>
              Start
              <input
                type="time"
                value={editor.start}
                onChange={(e) => updateEditor({ start: e.target.value })}
              />
            </label>
            <label className={styles.timeField}>
              End
              <input
                type="time"
                value={editor.end}
                onChange={(e) => updateEditor({ end: e.target.value })}
              />
            </label>
          </div>

          <div className={styles.editorActions}>
            <button
              className={styles.editorAction}
              onClick={() => {
                updateEditor({ start: "", end: "" });
              }}
            >
              Clear time
            </button>
            <button
              className={styles.editorAction}
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
            <button
              className={styles.editorActionPrimary}
              onClick={() => {
                void saveTaskEditor();
              }}
              disabled={Boolean(
                (editor.start.trim() && !editor.end.trim()) ||
                (!editor.start.trim() && editor.end.trim())
              )}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContentBlock({
  html,
  onToggleTask,
  onRequestEditTask,
  vaultName,
  vaultPath,
  notePath,
}: {
  html: string;
  onToggleTask: (idx: number) => void;
  onRequestEditTask: (taskIdx: number, anchorRect: DOMRect) => void;
  vaultName?: string;
  vaultPath?: string;
  notePath?: string | null;
}) {
  function handleLinkActivation(link: HTMLElement) {
    const linkKind = link.getAttribute("data-link-kind");
    if (linkKind === "obsidian") {
      const page = link.getAttribute("data-page")?.trim();
      if (!page || !vaultName) return;
      openUrl(buildObsidianUrl(vaultName, page)).catch((err) =>
        console.error("[DayDock] openUrl wikilink error:", err)
      );
      return;
    }

    const href = link.getAttribute("data-href")?.trim();
    if (!href) return;

    if (isExternalUrl(href) || URL_SCHEME_PATTERN.test(href)) {
      openUrl(href).catch((err) =>
        console.error("[DayDock] openUrl link error:", err)
      );
      return;
    }

    if (!vaultName) return;
    const internalTarget = resolveInternalNoteTarget(href, notePath, vaultPath);
    if (!internalTarget) return;

    openUrl(buildObsidianUrl(vaultName, internalTarget)).catch((err) =>
      console.error("[DayDock] openUrl internal markdown error:", err)
    );
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    // Checkbox toggle
    if (target.matches('input[type="checkbox"]')) {
      e.preventDefault();
      const raw = target.getAttribute("data-task-index");
      if (raw !== null) onToggleTask(Number(raw));
      return;
    }

    const link = target.closest("[data-link-kind]") as HTMLElement | null;
    if (link) {
      e.preventDefault();
      handleLinkActivation(link);
      return;
    }

    const taskListItem = target.closest("li");
    if (!taskListItem) return;

    const taskInput = taskListItem.querySelector(
      'input[type="checkbox"][data-task-index]'
    ) as HTMLInputElement | null;
    if (!taskInput) return;

    const raw = taskInput.getAttribute("data-task-index");
    if (raw === null) return;

    e.preventDefault();
    onRequestEditTask(Number(raw), taskListItem.getBoundingClientRect());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;

    const target = e.target as HTMLElement;
    const link = target.closest("[data-link-kind]") as HTMLElement | null;
    if (!link) return;

    e.preventDefault();
    handleLinkActivation(link);
  }

  return (
    <div
      className={`${styles.content} selectable`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    />
  );
}

function SectionBlock({
  section,
  html,
  onToggleTask,
  onRequestEditTask,
  vaultName,
  vaultPath,
  notePath,
}: {
  section: NoteSection;
  html: string;
  onToggleTask: (idx: number) => void;
  onRequestEditTask: (taskIdx: number, anchorRect: DOMRect) => void;
  vaultName?: string;
  vaultPath?: string;
  notePath?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const HeadingTag = `h${Math.min(section.level, 6)}` as
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6";

  return (
    <div className={styles.section} data-level={section.level}>
      <button
        className={styles.heading}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <HeadingTag className={styles.headingText}>{section.title}</HeadingTag>
        <CaretDown
          size={12}
          className={`${styles.chevron} ${collapsed ? styles.collapsed : ""}`}
        />
      </button>
      {!collapsed && section.content && (
        <ContentBlock
          html={html}
          onToggleTask={onToggleTask}
          onRequestEditTask={onRequestEditTask}
          vaultName={vaultName}
          vaultPath={vaultPath}
          notePath={notePath}
        />
      )}
    </div>
  );
}
