import { marked } from "marked";
import DOMPurify from "dompurify";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function preprocessObsidian(markdown: string): string {
  let text = markdown.replace(/^---\n[\s\S]*?\n---\n/, "");

  // Wikilinks: [[Page Name]] or [[Page Name|Alias]]
  text = text.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_, page, alias) =>
      `<a class="wikilink" data-link-kind="obsidian" data-page="${escapeHtml(page.trim())}" role="link" tabindex="0">${escapeHtml((alias ?? page).trim())}</a>`
  );

  // Inline tags: #tag
  text = text.replace(
    /(?<![&=\w/])#([a-zA-Z][a-zA-Z0-9/_-]*)/g,
    '<span class="tag">#$1</span>'
  );

  return text;
}

export interface ParseMarkdownResult {
  html: string;
  taskCount: number;
}

/**
 * Parse markdown → sanitized HTML.
 * startIdx: global task index offset so data-task-index is unique across sections.
 */
export function parseMarkdown(
  markdown: string,
  startIdx = 0
): ParseMarkdownResult {
  const preprocessed = preprocessObsidian(markdown);
  const rawHtml = marked.parse(preprocessed) as string;

  let idx = startIdx;

  // Remove `disabled`, add data-task-index, preserve checked state
  const withIndices = rawHtml.replace(
    /<input([^>]*?)type="checkbox"([^>]*?)>/g,
    (_, before, after) => {
      const isChecked = /\bchecked\b/.test(before + after);
      return `<input type="checkbox"${isChecked ? " checked" : ""} data-task-index="${idx++}">`;
    }
  );

  // Move href → data-href so Tauri's WKWebView doesn't navigate the window on click.
  // Our React click handler reads data-href and calls openUrl() instead.
  const withSafeLinks = withIndices.replace(
    /<a\s([^>]*?)href="([^"]*)"([^>]*)>/g,
    (_, before, href, after) =>
      `<a ${before}data-href="${escapeHtml(href)}" data-link-kind="markdown" role="link" tabindex="0"${after}>`
  );

  const html = DOMPurify.sanitize(withSafeLinks, {
    ADD_TAGS: ["input"],
    ADD_ATTR: [
      "class",
      "type",
      "checked",
      "data-task-index",
      "data-page",
      "data-href",
      "data-link-kind",
      "role",
      "tabindex",
    ],
  });

  return { html, taskCount: idx - startIdx };
}
