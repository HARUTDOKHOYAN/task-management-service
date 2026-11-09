/* Planner: a month view of open tasks from all projects. Pure functions. "now" is passed in. */
import { addDays, iso, startOfDay } from "./dates";
import { dueTime, infoOf, type TaskInfo } from "./priority";
import type { Project, Task } from "./types";

/** Days to show for a month: full weeks, Monday first. `month` is 0-11. */
export function monthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const last = new Date(year, month + 1, 0);
  const end = addDays(last, (7 - last.getDay()) % 7);
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Open tasks by deadline day ("YYYY-MM-DD"), earliest deadline first. Tasks without a deadline are left out. */
export function openByDay(tasks: Task[], projects: Project[], now: Date): Map<string, TaskInfo[]> {
  const map = new Map<string, TaskInfo[]>();
  for (const x of tasks.map((t) => infoOf(t, projects, now))) {
    if (x.level === "done" || !x.due) continue;
    const key = iso(x.due.date);
    map.set(key, [...(map.get(key) ?? []), x]);
  }
  for (const list of map.values()) list.sort((a, b) => dueTime(a) - dueTime(b));
  return map;
}

export type MonthSummary = { open: number; daysLeft: number; free: number; busiest: { date: Date; count: number } | null };

/** From today (or the 1st, for a future month) to the end of the month. */
export function monthSummary(byDay: Map<string, TaskInfo[]>, year: number, month: number, now: Date): MonthSummary {
  const today = startOfDay(now);
  const last = new Date(year, month + 1, 0);
  let d = new Date(year, month, 1) < today ? today : new Date(year, month, 1);
  const s: MonthSummary = { open: 0, daysLeft: 0, free: 0, busiest: null };
  for (; d <= last; d = addDays(d, 1)) {
    const count = byDay.get(iso(d))?.length ?? 0;
    s.daysLeft += 1;
    s.open += count;
    if (count === 0) s.free += 1;
    if (count > (s.busiest?.count ?? 0)) s.busiest = { date: d, count };
  }
  return s;
}
