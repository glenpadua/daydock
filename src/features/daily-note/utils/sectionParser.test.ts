import { describe, expect, it } from "vitest";
import { replaceSectionContent } from "./sectionParser";

describe("replaceSectionContent", () => {
  it("updates only the requested section body", () => {
    const raw = [
      "---",
      "title: Test",
      "---",
      "# Intro",
      "Lead paragraph",
      "## Tasks",
      "- [ ] One",
      "## Notes",
      "Original note",
    ].join("\n");

    const next = replaceSectionContent(raw, 2, "Updated note\nSecond line");

    expect(next).toContain("## Tasks\n- [ ] One");
    expect(next).toContain("## Notes\nUpdated note\nSecond line");
    expect(next).not.toContain("Original note");
  });

  it("supports clearing a section", () => {
    const raw = [
      "## Tasks",
      "- [ ] One",
      "## Notes",
      "Original note",
    ].join("\n");

    expect(replaceSectionContent(raw, 0, "")).toBe(["## Tasks", "## Notes", "Original note"].join("\n"));
  });
});
