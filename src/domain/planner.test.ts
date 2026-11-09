import { describe, expect, it } from "vitest";
import { iso } from "./dates";
import { monthDays, monthSummary, openByDay } from "./planner";
import type { Project, Task } from "./types";

const P: Project = { id: "p", name: "P", color: "#1868DB", deadline: "2026-10-31", note: "", createdAt: "", updatedAt: "" };
const now = new Date(2026, 9, 8, 15, 0); // Thu 8 Oct 2026, 15:00

function task(over: Partial<Task> = {}): Task {
  return { id: "t", projectId: "p", name: "T", date: null, time: null, pinned: false, done: false, doneAt: null, archivedAt: null, createdAt: "", updatedAt: "", ...over };
}

describe("planner", () => {
  it("month grid starts on Monday and covers full weeks", () => {
    const days = monthDays(2026, 9); // October 2026 starts on a Thursday
    expect(days).toHaveLength(35);
    expect(iso(days[0])).toBe("2026-09-28");
    expect(iso(days[34])).toBe("2026-11-01");
  });
  it("a month that starts on Monday has no days before it", () => {
    const days = monthDays(2026, 5); // June 2026 starts on a Monday
    expect(iso(days[0])).toBe("2026-06-01");
    expect(days.length % 7).toBe(0);
    expect(iso(days[days.length - 1])).toBe("2026-07-05");
  });

  it("groups open tasks by their deadline day, earliest first", () => {
    const tasks = [
      task({ id: "a", date: "2026-10-09", time: "15:00" }),
      task({ id: "b", date: "2026-10-09", time: "09:00" }),
      task({ id: "c", date: "2026-10-09", done: true }),
      task({ id: "d" }), // no date: project deadline
      task({ id: "e", projectId: "gone" }), // no date and no project: no deadline
    ];
    const map = openByDay(tasks, [P], now);
    expect(map.get("2026-10-09")!.map((x) => x.task.id)).toEqual(["b", "a"]);
    expect(map.get("2026-10-31")!.map((x) => x.task.id)).toEqual(["d"]);
    expect([...map.values()].flat()).toHaveLength(3);
  });

  it("summary for the current month counts from today", () => {
    const tasks = [
      task({ id: "a", date: "2026-10-07" }),
      task({ id: "b", date: "2026-10-09" }),
      task({ id: "c", date: "2026-10-12" }),
      task({ id: "d", date: "2026-10-12" }),
    ];
    const s = monthSummary(openByDay(tasks, [P], now), 2026, 9, now);
    expect(s.open).toBe(3);
    expect(s.daysLeft).toBe(24);
    expect(s.free).toBe(22);
    expect(iso(s.busiest!.date)).toBe("2026-10-12");
    expect(s.busiest!.count).toBe(2);
  });
  it("summary for a future month uses every day", () => {
    const s = monthSummary(new Map(), 2026, 10, now);
    expect([s.open, s.daysLeft, s.free, s.busiest]).toEqual([0, 30, 30, null]);
  });
  it("summary for a past month is empty", () => {
    const s = monthSummary(new Map(), 2026, 8, now);
    expect([s.open, s.daysLeft, s.free, s.busiest]).toEqual([0, 0, 0, null]);
  });
});
