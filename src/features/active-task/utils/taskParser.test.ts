import { describe, expect, it } from "vitest";
import {
  findActiveTaskIndex,
  parseTasks,
  setTaskTimeBlock,
  updateTaskText,
} from "./taskParser";

describe("taskParser", () => {
  it("parses time-blocked and plain tasks", () => {
    const raw = [
      "- [ ] 09:00 - 10:30 → Deep work",
      "- [ ] Inbox zero",
    ].join("\n");

    const tasks = parseTasks(raw);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].timeBlock?.start).toBe("09:00");
    expect(tasks[0].timeBlock?.end).toBe("10:30");
    expect(tasks[0].taskText).toBe("Deep work");
    expect(tasks[1].timeBlock).toBeNull();
    expect(tasks[1].taskText).toBe("Inbox zero");
  });

  it("parses blank task lines without dropping them", () => {
    const raw = "- [ ]";
    const tasks = parseTasks(raw);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].taskText).toBe("");
  });

  it("updates only task text and preserves existing time-block prefix", () => {
    const raw = "- [ ] 9:00 - 10:00 → Old text";
    const next = updateTaskText(raw, 0, "New text");
    expect(next).toBe("- [ ] 9:00 - 10:00 → New text");
  });

  it("adds, edits, and removes a time block", () => {
    const raw = "- [ ] Write docs";
    const withTime = setTaskTimeBlock(raw, 0, "9:00", "10:45");
    expect(withTime).toBe("- [ ] 09:00 - 10:45 → Write docs");

    const updatedTime = setTaskTimeBlock(withTime, 0, "11:00", "11:30");
    expect(updatedTime).toBe("- [ ] 11:00 - 11:30 → Write docs");

    const removedTime = setTaskTimeBlock(updatedTime, 0, null, null);
    expect(removedTime).toBe("- [ ] Write docs");
  });

  it("picks the current time-blocked task before fallback", () => {
    const raw = [
      "- [ ] 08:00 - 09:00 → Earlier",
      "- [ ] 09:00 - 10:00 → Current",
      "- [ ] Fallback task",
    ].join("\n");
    const tasks = parseTasks(raw);

    expect(findActiveTaskIndex(tasks, new Date("2026-03-11T09:30:00"))).toBe(1);
    expect(findActiveTaskIndex(tasks, new Date("2026-03-11T11:00:00"))).toBe(0);
  });

  it("ignores invalid time ranges for current-window matching", () => {
    const raw = [
      "- [ ] 18:00 - 10:00 → Invalid",
      "- [ ] Regular fallback",
    ].join("\n");
    const tasks = parseTasks(raw);
    expect(findActiveTaskIndex(tasks, new Date("2026-03-11T09:30:00"))).toBe(0);
  });
});
