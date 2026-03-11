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

export function parseNoteSections(markdown: string): ParsedNote {
  const frontmatter: Record<string, string> = {};
  let body = markdown;

  // Strip YAML frontmatter and parse key: value pairs
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (fmMatch) {
    body = markdown.slice(fmMatch[0].length);
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
