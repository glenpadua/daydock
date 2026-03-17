export interface NoteSection {
  title: string;
  level: number;
  content: string;
}

export interface ParsedNote {
  frontmatter: Record<string, string>;
  preamble: string; // content before the first heading
  sections: NoteSection[];
}

function splitFrontmatter(markdown: string): { prefix: string; body: string } {
  const match = markdown.match(/^---\n[\s\S]*?\n---\n/);
  if (!match) return { prefix: "", body: markdown };

  return {
    prefix: match[0],
    body: markdown.slice(match[0].length),
  };
}

export function parseNoteSections(markdown: string): ParsedNote {
  const frontmatter: Record<string, string> = {};
  const { prefix, body: initialBody } = splitFrontmatter(markdown);
  let body = initialBody;

  // Strip YAML frontmatter and parse key: value pairs
  const fmMatch = prefix.match(/^---\n([\s\S]*?)\n---\n$/);
  if (fmMatch) {
    for (const line of fmMatch[1].split("\n")) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        const val = line.slice(colonIdx + 1).trim();
        if (key) frontmatter[key] = val;
      }
    }
  }

  const lines = body.split("\n");
  const sections: NoteSection[] = [];
  let preambleLines: string[] = [];
  let current: NoteSection | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (current) {
        current.content = current.content.trimEnd();
        sections.push(current);
      }
      current = {
        title: headingMatch[2],
        level: headingMatch[1].length,
        content: "",
      };
    } else if (current) {
      current.content += line + "\n";
    } else {
      preambleLines.push(line);
    }
  }

  if (current) {
    current.content = current.content.trimEnd();
    sections.push(current);
  }

  return {
    frontmatter,
    preamble: preambleLines.join("\n").trim(),
    sections,
  };
}

export function replaceSectionContent(
  markdown: string,
  sectionIndex: number,
  newContent: string
): string {
  const { prefix, body } = splitFrontmatter(markdown);
  const lines = body.split("\n");
  const headingIndices: number[] = [];

  for (let idx = 0; idx < lines.length; idx += 1) {
    if (/^(#{1,6})\s+(.+)/.test(lines[idx])) {
      headingIndices.push(idx);
    }
  }

  const headingIndex = headingIndices[sectionIndex];
  if (headingIndex === undefined) return markdown;

  const contentStart = headingIndex + 1;
  const contentEnd = headingIndices[sectionIndex + 1] ?? lines.length;
  const normalizedContent = newContent.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  const replacementLines = normalizedContent ? normalizedContent.split("\n") : [];
  const nextLines = [
    ...lines.slice(0, contentStart),
    ...replacementLines,
    ...lines.slice(contentEnd),
  ];

  return `${prefix}${nextLines.join("\n")}`;
}
