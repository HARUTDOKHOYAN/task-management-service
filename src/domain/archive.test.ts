import { describe, expect, it } from "vitest";
import { archiveGroups, canArchive, splitArchived } from "./archive";
import type { Project, Task } from "./types";

const P: Project = { id: "p", name: "P", color: "#1868DB", deadline: "2026-10-12", importance: 2, paused: false, note: "", createdAt: "", updatedAt: "" };
const Q: Project = { ...P, id: "q", name: "Q" };

function task(over: Partial<Task> = {}): Task {
  return { id: "t", projectId: "p", name: "T", date: null, time: null, size: 60, pinned: false, done: false, doneAt: null, archivedAt: null, createdAt: "", updatedAt: "", ...over };
}

describe("archive", () => {
  it("only done tasks can be archived", () => {
    expect(canArchive(task())).toBe(false);
    expect(canArchive(task({ done: true }))).toBe(true);
    expect(canArchive(task({ done: true, archivedAt: "2026-10-08T10:00:00.000Z" }))).toBe(false);
  });

  it("splits active and archived tasks", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b", done: true, archivedAt: "2026-10-08T10:00:00.000Z" });
    const c = task({ id: "c", done: true });
    const { active, archived } = splitArchived([a, b, c]);
    expect(active.map((t) => t.id)).toEqual(["a", "c"]);
    expect(archived.map((t) => t.id)).toEqual(["b"]);
  });
  it("old tasks without archivedAt count as active", () => {
    const old = { ...task({ id: "old" }), archivedAt: undefined } as unknown as Task;
    expect(splitArchived([old]).active).toHaveLength(1);
  });

  it("groups by project, newest archive first", () => {
    const list = [
      task({ id: "a", projectId: "p", archivedAt: "2026-10-01T10:00:00.000Z" }),
      task({ id: "b", projectId: "q", archivedAt: "2026-10-05T10:00:00.000Z" }),
      task({ id: "c", projectId: "p", archivedAt: "2026-10-07T10:00:00.000Z" }),
      task({ id: "d", projectId: "gone", archivedAt: "2026-10-09T10:00:00.000Z" }),
    ];
    const groups = archiveGroups(list, [P, Q]);
    expect(groups.map((g) => g.project.id)).toEqual(["p", "q"]);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["c", "a"]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual(["b"]);
  });
  it("no archived tasks, no groups", () => {
    expect(archiveGroups([], [P, Q])).toEqual([]);
  });
});
