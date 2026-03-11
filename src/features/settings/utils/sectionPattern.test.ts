import { afterEach, describe, expect, it, vi } from "vitest";
import {
  compileIfTimeSectionRegex,
  DEFAULT_IF_TIME_SECTION_PATTERN,
} from "./sectionPattern";

describe("compileIfTimeSectionRegex", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("compiles a valid custom regex pattern", () => {
    const regex = compileIfTimeSectionRegex("^later$");
    expect(regex.test("Later")).toBe(true);
    expect(regex.test("If time")).toBe(false);
  });

  it("falls back to default pattern when invalid regex is provided", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const regex = compileIfTimeSectionRegex("[");

    expect(regex.source).toBe(DEFAULT_IF_TIME_SECTION_PATTERN);
    expect(regex.flags).toContain("i");
    expect(warn).toHaveBeenCalledOnce();
  });

  it("uses the default when pattern is empty", () => {
    const regex = compileIfTimeSectionRegex("   ");
    expect(regex.test("If Time")).toBe(true);
  });
});
