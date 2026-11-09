import { describe, expect, it } from "vitest";
import { addedLabel, openFreeTasks, pickFree } from "./freeTime";
import type { FreeTask } from "./types";

const now = new Date(2026, 9, 8, 15, 0); // Thu 8 Oct 2026, 15:00

function free(over: Partial<FreeTask> = {}): FreeTask {
  return { id: "f", name: "F", done: false, doneAt: null, createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "", ...over };
}

describe("free time", () => {
  it("shows only open tasks, newest first", () => {
    const list = [
      free({ id: "a", createdAt: "2026-10-01T10:00:00.000Z" }),
      free({ id: "b", createdAt: "2026-10-05T10:00:00.000Z" }),
      free({ id: "c", createdAt: "2026-10-07T10:00:00.000Z", done: true }),
    ];
    expect(openFreeTasks(list).map((t) => t.id)).toEqual(["b", "a"]);
  });

  it("pick returns null for an empty list", () => {
    expect(pickFree([], null, () => 0)).toBeNull();
  });
  it("pick uses the random number", () => {
    const list = [free({ id: "a" }), free({ id: "b" }), free({ id: "c" })];
    expect(pickFree(list, null, () => 0)!.id).toBe("a");
    expect(pickFree(list, null, () => 0.5)!.id).toBe("b");
    expect(pickFree(list, null, () => 0.99)!.id).toBe("c");
  });
  it("pick does not repeat the last pick when there is a choice", () => {
    const list = [free({ id: "a" }), free({ id: "b" })];
    expect(pickFree(list, "a", () => 0)!.id).toBe("b");
    expect(pickFree(list, "b", () => 0.99)!.id).toBe("a");
  });
  it("pick can repeat when there is only one task", () => {
    expect(pickFree([free({ id: "a" })], "a", () => 0.5)!.id).toBe("a");
  });
  it("pick stays in range when random returns 1", () => {
    expect(pickFree([free({ id: "a" }), free({ id: "b" })], null, () => 1)!.id).toBe("b");
  });

  it("added label uses calendar days", () => {
    const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();
    expect(addedLabel(at(2026, 9, 8, 9), now)).toBe("Added today");
    expect(addedLabel(at(2026, 9, 7, 23), now)).toBe("Added yesterday");
    expect(addedLabel(at(2026, 9, 3), now)).toBe("Added 5 days ago");
    expect(addedLabel(at(2026, 8, 25), now)).toBe("Added 13 days ago");
    expect(addedLabel(at(2026, 8, 24), now)).toBe("Added 2 weeks ago");
    expect(addedLabel(at(2026, 8, 1), now)).toBe("Added 5 weeks ago");
  });
});
