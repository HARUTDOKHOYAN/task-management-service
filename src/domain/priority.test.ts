import { describe, expect, it } from "vitest";
import { dueOf, groupForMain, infoOf, isOverdue, levelOf, sortTasks, weekLoad } from "./priority";
import type { Project, Task } from "./types";

const P: Project = { id: "p", name: "P", color: "#1868DB", deadline: "2026-10-12", note: "", createdAt: "", updatedAt: "" };
const now = new Date(2026, 9, 8, 15, 0); // Thu 8 Oct 2026, 15:00

function task(over: Partial<Task> = {}): Task {
  return { id: "t", projectId: "p", name: "T", date: null, time: null, pinned: false, done: false, doneAt: null, createdAt: "", updatedAt: "", ...over };
}
const level = (t: Task, n = now, p = P) => levelOf(t, dueOf(t, p, n));

describe("priority", () => {
  it("no date uses the project deadline, end of day", () => {
    const d = dueOf(task(), P, now)!;
    expect(d.fromProject).toBe(true);
    expect(d.days).toBe(4);
    expect(d.at.getHours()).toBe(23);
    expect(level(task())).toBe("low");
  });
  it("no time means end of day", () => {
    expect(dueOf(task({ date: "2026-10-08" }), P, now)!.hasTime).toBe(false);
    expect(isOverdue(task({ date: "2026-10-08" }), dueOf(task({ date: "2026-10-08" }), P, now), now)).toBe(false);
  });
  it("time is ignored when there is no date", () => {
    expect(dueOf(task({ time: "09:00" }), P, now)!.hasTime).toBe(false);
  });
  it("levels by days left", () => {
    expect(level(task({ date: "2026-10-07" }))).toBe("high");
    expect(level(task({ date: "2026-10-08" }))).toBe("high");
    expect(level(task({ date: "2026-10-09" }))).toBe("high");
    expect(level(task({ date: "2026-10-10" }))).toBe("medium");
    expect(level(task({ date: "2026-10-11" }))).toBe("medium");
    expect(level(task({ date: "2026-10-12" }))).toBe("low");
  });
  it("pinned is always High, done is done", () => {
    expect(level(task({ pinned: true, date: "2026-12-01" }))).toBe("high");
    expect(level(task({ done: true, pinned: true }))).toBe("done");
  });
  it("no deadline at all is Low", () => {
    expect(dueOf(task(), undefined, now)).toBeNull();
    expect(levelOf(task(), null)).toBe("low");
  });
  it("deadline today at an earlier hour is overdue", () => {
    const t = task({ date: "2026-10-08", time: "10:00" });
    expect(isOverdue(t, dueOf(t, P, now), now)).toBe(true);
    expect(isOverdue({ ...t, done: true }, dueOf(t, P, now), now)).toBe(false);
  });
  it("month change", () => {
    const n = new Date(2026, 9, 31, 12);
    expect(dueOf(task({ date: "2026-11-01" }), P, n)!.days).toBe(1);
  });
  it("daylight-saving change counts calendar days", () => {
    const n = new Date(2026, 2, 28, 23, 30);
    expect(dueOf(task({ date: "2026-03-31" }), P, n)!.days).toBe(3);
    const n2 = new Date(2026, 9, 24, 0, 30);
    expect(dueOf(task({ date: "2026-10-26" }), P, n2)!.days).toBe(2);
  });
  it("sorts by level, then deadline", () => {
    const list = [
      task({ id: "a", date: "2026-10-12" }),
      task({ id: "b", date: "2026-10-09", time: "10:00" }),
      task({ id: "c", date: "2026-10-09", time: "09:00" }),
      task({ id: "d", done: true }),
      task({ id: "e", date: "2026-10-10" }),
    ].map((t) => infoOf(t, [P], now));
    list.push(infoOf(task({ id: "f", projectId: "none" }), [P], now));
    expect(sortTasks(list).map((x) => x.task.id)).toEqual(["c", "b", "e", "a", "f", "d"]);
  });
  it("groups only projects with High tasks, earliest first", () => {
    const Q: Project = { ...P, id: "q" };
    const R: Project = { ...P, id: "r" };
    const tasks = [
      task({ id: "1", projectId: "p", date: "2026-10-09" }),
      task({ id: "2", projectId: "q", date: "2026-10-08", time: "16:00" }),
      task({ id: "3", projectId: "r", date: "2026-10-11" }),
      task({ id: "4", projectId: "p", date: "2026-10-10" }),
      task({ id: "5", projectId: "p", done: true }),
    ];
    const g = groupForMain(tasks, [P, Q, R], now);
    expect(g.active.map((x) => x.project.id)).toEqual(["q", "p"]);
    expect(g.active[1].medium).toBe(1);
    expect(g.quiet.map((p) => p.id)).toEqual(["r"]);
  });
  it("week load counts overdue on today and skips done and far tasks", () => {
    const tasks = [
      task({ date: "2026-10-05" }),
      task({ date: "2026-10-08" }),
      task({ date: "2026-10-11" }),
      task({ date: "2026-10-20" }),
      task({ date: "2026-10-09", done: true }),
    ];
    const w = weekLoad(tasks, [P], now);
    expect(w).toHaveLength(7);
    expect(w[0].high).toBe(2);
    expect(w[3].medium).toBe(1);
    expect(w.reduce((s, d) => s + d.high + d.medium + d.low, 0)).toBe(3);
  });
});
