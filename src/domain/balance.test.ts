import { describe, expect, it } from "vitest";
import { asOf, balance, balanceOf, balanceTrend, daysWaiting, planToday } from "./priority";
import type { Project, Task } from "./types";

const now = new Date(2026, 9, 8, 15, 0); // Thu 8 Oct 2026, 15:00
/** Time stamp some days before "now", at 10:00 local time. */
const ago = (days: number, hour = 10) => new Date(2026, 9, 8 - days, hour, 0).toISOString();

function project(over: Partial<Project> = {}): Project {
  return { id: "p", name: "P", color: "#1868DB", deadline: null, importance: 2, paused: false, note: "", createdAt: ago(30), updatedAt: ago(30), ...over };
}
function task(over: Partial<Task> = {}): Task {
  return { id: "t", projectId: "p", name: "T", date: null, time: null, size: 60, pinned: false, done: false, doneAt: null, archivedAt: null, createdAt: ago(30), updatedAt: ago(30), ...over };
}
/** n open tasks of one hour. */
const open = (n: number, over: Partial<Task> = {}) => Array.from({ length: n }, (_, i) => task({ ...over, id: `${over.projectId ?? "p"}-open-${i}` }));
/** A finished task: work on the project some days ago. */
const worked = (days: number, over: Partial<Task> = {}) => task({ id: `${over.projectId ?? "p"}-done-${days}`, done: true, doneAt: ago(days), ...over });

describe("asOf", () => {
  it("shows tasks as they were at that time", () => {
    const tasks = [
      task({ id: "old" }),
      task({ id: "later", createdAt: ago(-1) }),
      task({ id: "done-before", done: true, doneAt: ago(1) }),
      task({ id: "done-later", done: true, doneAt: ago(-1) }),
      task({ id: "no-stamp", createdAt: "" }),
    ];
    const view = asOf(tasks, now);
    expect(view.map((t) => t.id)).toEqual(["old", "done-before", "done-later", "no-stamp"]);
    expect(view.find((t) => t.id === "done-before")?.done).toBe(true);
    expect(view.find((t) => t.id === "done-later")).toMatchObject({ done: false, doneAt: null });
  });
});

describe("daysWaiting", () => {
  it("counts from the day the project was created when there is no work", () => {
    expect(daysWaiting(project(), [task()], now)).toBe(30);
  });
  it("is 0 when the project has no creation date", () => {
    expect(daysWaiting(project({ createdAt: "" }), [], now)).toBe(0);
  });
  it("a finished task of 1 hour or more resets the count", () => {
    expect(daysWaiting(project(), [worked(2)], now)).toBe(2);
    expect(daysWaiting(project(), [worked(0, { size: 240 })], now)).toBe(0);
    expect(daysWaiting(project(), [worked(1), worked(9)], now)).toBe(1); // the order in the list does not matter
  });
  it("a smaller task lowers the count in part", () => {
    const p = project({ createdAt: ago(12) });
    expect(daysWaiting(p, [worked(0, { size: 30 })], now)).toBe(6); // half
    expect(daysWaiting(p, [worked(0, { size: 10 })], now)).toBe(10); // one sixth
  });
  it("ignores other projects, open tasks and done tasks with no done time", () => {
    const tasks = [worked(1, { projectId: "q" }), task({ id: "open" }), task({ id: "no-time", done: true })];
    expect(daysWaiting(project(), tasks, now)).toBe(30);
  });
  it("ignores work from before the project was created", () => {
    expect(daysWaiting(project({ createdAt: ago(5) }), [worked(10)], now)).toBe(5);
  });
});

describe("balanceOf", () => {
  it("score = √hours × importance × waiting × deadline", () => {
    const p = project({ importance: 3 });
    const tasks = [...open(8), task({ id: "dated", date: "2026-10-12" }), worked(2)];
    const b = balanceOf(p, tasks, [p], now);
    expect(b.minutes).toBe(540);
    expect(b.days).toBe(2);
    expect(b.wait).toBeCloseTo(1.2857, 4);
    expect(b.soon).toBe(true);
    expect(b.urgency).toBe(1.5);
    expect(b.score).toBeCloseTo(17.36, 2); // √9 × 3 × 1.29 × 1.5
  });
  it("adds up the sizes of open tasks only", () => {
    const p = project();
    const tasks = [task({ id: "a", size: 30 }), task({ id: "b", size: 120 }), worked(0, { size: 240 }), task({ id: "c", projectId: "q" })];
    expect(balanceOf(p, tasks, [p], now).minutes).toBe(150);
  });
  it("the deadline factor is 1.5 only when a task is due in the next 7 days", () => {
    const p = project();
    const urgency = (over: Partial<Task>) => balanceOf(p, [task(over)], [p], now).urgency;
    expect(urgency({})).toBe(1); // no deadline
    expect(urgency({ date: "2026-10-15" })).toBe(1); // day 7
    expect(urgency({ date: "2026-10-14" })).toBe(1.5); // day 6
    expect(urgency({ date: "2026-10-01" })).toBe(1.5); // overdue
    expect(urgency({ pinned: true })).toBe(1); // pinned has no deadline
    const withDeadline = project({ deadline: "2026-10-10" });
    expect(balanceOf(withDeadline, [task()], [withDeadline], now).urgency).toBe(1.5); // project deadline
  });
  it("is 0 for a project with no open tasks", () => {
    const p = project();
    expect(balanceOf(p, [worked(1)], [p], now).score).toBe(0);
  });
  it("is 0 for a paused project, and keeps the work left", () => {
    const p = project({ paused: true });
    const b = balanceOf(p, open(3), [p], now);
    expect(b.score).toBe(0);
    expect(b.minutes).toBe(180);
  });
  it("puts the next task first: level, deadline, smaller size, older task", () => {
    const p = project();
    const tasks = [
      task({ id: "big", size: 120 }),
      task({ id: "small-new", size: 30, createdAt: ago(1) }),
      task({ id: "small-old", size: 30, createdAt: ago(9) }),
      task({ id: "dated", date: "2026-10-20", size: 240 }),
      task({ id: "high", date: "2026-10-09", size: 240 }),
    ];
    expect(balanceOf(p, tasks, [p], now).open.map((x) => x.task.id)).toEqual(["high", "dated", "small-old", "small-new", "big"]);
  });
});

describe("balance", () => {
  it("many tasks in a Low project weigh more than one task in a High project", () => {
    const low = project({ id: "low", importance: 1 });
    const high = project({ id: "high", importance: 3 });
    const tasks = [...open(20, { projectId: "low" }), worked(0, { projectId: "low" }), ...open(1, { projectId: "high" }), worked(0, { projectId: "high" })];
    const { rows, total } = balance(tasks, [high, low], now);
    expect(rows.map((r) => r.project.id)).toEqual(["low", "high"]);
    expect(rows[0].score).toBeCloseTo(4.47, 2);
    expect(rows[1].score).toBeCloseTo(3, 2);
    expect(total).toBeCloseTo(7.47, 2);
  });
  it("a forgotten Low project passes an active High project after some time", () => {
    const a = project({ id: "a", importance: 3 });
    const b = project({ id: "b", importance: 1 });
    const base = [...open(4, { projectId: "a" }), worked(0, { projectId: "a" }), ...open(4, { projectId: "b" })];
    const late = balance([...base, worked(21, { projectId: "b" })], [a, b], now);
    expect(late.rows.map((r) => [r.project.id, Math.round(r.score)])).toEqual([["b", 8], ["a", 6]]);
    const tie = balance([...base, worked(14, { projectId: "b" })], [b, a], now);
    expect(tie.rows.map((r) => [r.project.id, Math.round(r.score)])).toEqual([["a", 6], ["b", 6]]); // same score: higher importance first
  });
});

describe("planToday", () => {
  const a = project({ id: "a", importance: 3 });
  const b = project({ id: "b", importance: 2 });
  const c = project({ id: "c", importance: 1 });
  const d = project({ id: "d" });
  const e = project({ id: "e", paused: true });
  const tasks = [
    task({ id: "a1", projectId: "a", date: "2026-10-08", time: "18:00", size: 30 }),
    task({ id: "a3", projectId: "a", size: 120 }),
    task({ id: "a2", projectId: "a", size: 60 }),
    worked(2, { projectId: "a" }),
    task({ id: "b2", projectId: "b", size: 240, createdAt: ago(3) }),
    task({ id: "b1", projectId: "b", size: 240, createdAt: ago(9) }),
    worked(5, { projectId: "b" }),
    task({ id: "c1", projectId: "c" }),
    worked(10, { projectId: "c" }),
    worked(1, { projectId: "d" }),
    task({ id: "e1", projectId: "e" }),
  ];
  const plan = planToday(tasks, [e, d, c, b, a], now);

  it("splits the projects: 2 for today, the others wait, score 0 last", () => {
    expect(plan.focus.map((r) => r.project.id)).toEqual(["a", "b"]);
    expect(plan.waiting.map((r) => r.project.id)).toEqual(["c"]);
    expect(plan.zero.map((r) => r.project.id).sort()).toEqual(["d", "e"]);
    expect(plan.total).toBeCloseTo(22.95, 2);
  });
  it("plans the High tasks and the next task of each project for today", () => {
    expect(plan.due.map((x) => x.task.id)).toEqual(["a1"]);
    expect(plan.tasks.map((x) => x.task.id)).toEqual(["a1", "a2", "b1"]);
    expect(plan.minutes).toBe(330);
  });
  it("tells the total after the plan is done", () => {
    expect(plan.after).toBeCloseTo(10.67, 2);
    expect(plan.after).toBeLessThan(plan.total);
  });
  it("adds no next task when every open task is already High", () => {
    const p = project();
    const only = planToday([task({ id: "x", pinned: true })], [p], now);
    expect(only.tasks.map((x) => x.task.id)).toEqual(["x"]);
    expect(only.after).toBe(0);
  });
});

describe("balanceTrend", () => {
  it("gives the total for each of the last 7 days, today last", () => {
    const p = project();
    const tasks = [
      task({ id: "t1" }),
      task({ id: "t2", size: 180, createdAt: ago(2) }),
      task({ id: "t3", done: true, doneAt: ago(1) }),
    ];
    const trend = balanceTrend(tasks, [p], now, 7);
    expect(trend).toHaveLength(7);
    expect(trend[0].date).toEqual(new Date(2026, 9, 2));
    expect(trend[6].date).toEqual(new Date(2026, 9, 8));
    expect(trend[6].total).toBeCloseTo(balance(tasks, [p], now).total, 6);
    expect(trend[6].total).toBeCloseTo(4.57, 2); // t1 + t2 = 4 h, worked yesterday
    expect(trend[3].total).toBeCloseTo(13.74, 2); // Mon 5 Oct: t1 + t3 = 2 h, no work for 27 days
  });
});
