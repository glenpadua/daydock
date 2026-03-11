export const DEFAULT_IF_TIME_SECTION_PATTERN = "if time";

export function compileIfTimeSectionRegex(pattern: string | undefined | null): RegExp {
  const source = pattern?.trim() || DEFAULT_IF_TIME_SECTION_PATTERN;

  try {
    return new RegExp(source, "i");
  } catch (error) {
    console.warn("[DayDock] invalid ifTimeSectionPattern, falling back to default:", source, error);
    return new RegExp(DEFAULT_IF_TIME_SECTION_PATTERN, "i");
  }
}
