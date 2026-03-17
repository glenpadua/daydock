import { useState } from "react";
import { CaretDown, PencilSimple } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { NoteSection } from "../utils/sectionParser";
import { parseMarkdown } from "../utils/markdownParser";
import styles from "./NoteRenderer.module.css";

interface Props {
  preamble: string;
  sections: NoteSection[];
  onToggleTask: (taskIdx: number) => void;
  onEditSection: (sectionIdx: number, newContent: string) => void | Promise<void>;
  vaultName?: string;
  vaultPath?: string;
  notePath?: string | null;
}

interface SectionEditorState {
  sectionIdx: number;
  title: string;
  content: string;
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
  onToggleTask,
  onEditSection,
  vaultName,
  vaultPath,
  notePath,
}: Props) {
  const [editor, setEditor] = useState<SectionEditorState | null>(null);

  const preambleResult = preamble ? parseMarkdown(preamble, 0) : null;
  let cumulativeTaskIdx = preambleResult?.taskCount ?? 0;
  const hasAnyContent = Boolean((preamble ?? "").trim()) || sections.some(
    (section) => section.title.trim() || section.content.trim()
  );

  async function saveSectionEditor() {
    if (!editor) return;
    await onEditSection(editor.sectionIdx, editor.content);
    setEditor(null);
  }

  return (
    <div className={styles.note}>
      {!hasAnyContent && (
        <p className={styles.emptyNote}>Today&apos;s note is empty.</p>
      )}

      {editor && (
        <div className={styles.sectionEditor}>
          <div className={styles.sectionEditorHeader}>
            <div>
              <p className={styles.sectionEditorLabel}>Editing section</p>
              <h3 className={styles.sectionEditorTitle}>{editor.title}</h3>
            </div>
            <button
              className={styles.sectionEditorClose}
              onClick={() => setEditor(null)}
            >
              Close
            </button>
          </div>

          <textarea
            className={styles.sectionEditorTextarea}
            value={editor.content}
            onChange={(e) => {
              setEditor((current) => (
                current ? { ...current, content: e.target.value } : current
              ));
            }}
            spellCheck={false}
            autoFocus
          />

          <div className={styles.sectionEditorActions}>
            <button
              className={styles.sectionEditorSecondary}
              onClick={() => setEditor(null)}
            >
              Cancel
            </button>
            <button
              className={styles.sectionEditorPrimary}
              onClick={() => {
                void saveSectionEditor();
              }}
            >
              Save section
            </button>
          </div>
        </div>
      )}

      {preambleResult && (
        <ContentBlock
          html={preambleResult.html}
          onToggleTask={onToggleTask}
          vaultName={vaultName}
          vaultPath={vaultPath}
          notePath={notePath}
        />
      )}

      {sections.map((section, sectionIdx) => {
        const startIdx = cumulativeTaskIdx;
        const result = parseMarkdown(section.content, startIdx);
        cumulativeTaskIdx += result.taskCount;

        return (
          <SectionBlock
            key={`${section.title}-${sectionIdx}`}
            section={section}
            sectionIdx={sectionIdx}
            html={result.html}
            onToggleTask={onToggleTask}
            onEditSection={(idx) => {
              const target = sections[idx];
              if (!target) return;

              setEditor({
                sectionIdx: idx,
                title: target.title,
                content: target.content,
              });
            }}
            vaultName={vaultName}
            vaultPath={vaultPath}
            notePath={notePath}
          />
        );
      })}
    </div>
  );
}

function ContentBlock({
  html,
  onToggleTask,
  vaultName,
  vaultPath,
  notePath,
}: {
  html: string;
  onToggleTask: (idx: number) => void;
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

    if (target.matches('input[type="checkbox"]')) {
      e.preventDefault();
      const raw = target.getAttribute("data-task-index");
      if (raw !== null) onToggleTask(Number(raw));
      return;
    }

    const link = target.closest("[data-link-kind]") as HTMLElement | null;
    if (!link) return;

    e.preventDefault();
    handleLinkActivation(link);
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
  sectionIdx,
  html,
  onToggleTask,
  onEditSection,
  vaultName,
  vaultPath,
  notePath,
}: {
  section: NoteSection;
  sectionIdx: number;
  html: string;
  onToggleTask: (idx: number) => void;
  onEditSection: (sectionIdx: number) => void;
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
      <div className={styles.sectionHeader}>
        <button
          className={styles.heading}
          onClick={() => setCollapsed((current) => !current)}
          aria-expanded={!collapsed}
        >
          <HeadingTag className={styles.headingText}>{section.title}</HeadingTag>
          <CaretDown
            size={12}
            className={`${styles.chevron} ${collapsed ? styles.collapsed : ""}`}
          />
        </button>

        <button
          className={styles.editButton}
          onClick={() => onEditSection(sectionIdx)}
          aria-label={`Edit ${section.title}`}
          title={`Edit ${section.title}`}
        >
          <PencilSimple size={12} />
          Edit
        </button>
      </div>

      {!collapsed && section.content && (
        <ContentBlock
          html={html}
          onToggleTask={onToggleTask}
          vaultName={vaultName}
          vaultPath={vaultPath}
          notePath={notePath}
        />
      )}
    </div>
  );
}
