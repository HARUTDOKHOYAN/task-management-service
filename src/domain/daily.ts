/* Daily checklist: jobs you do for a project every day. Checks reset at midnight. Pure functions. */
import { iso } from "./dates";
import type { Project, Routine } from "./types";

export const isDoneToday = (r: Routine, now: Date) => r.doneOn === iso(now);

/** New doneOn after a click: today when not done yet, empty when already done today. */
export const toggledDoneOn = (r: Routine, now: Date): string | null => (isDoneToday(r, now) ? null : iso(now));

export type DailyItem = { routine: Routine; done: boolean };
export type DailyGroup = { project: Project; items: DailyItem[]; done: number };

/** Jobs per project, in project order. Projects without jobs are left out. */
export function dailyGroups(routines: Routine[], projects: Project[], now: Date): { groups: DailyGroup[]; done: number; total: number } {
  const groups = projects
    .map((project) => {
      const items = routines
        .filter((r) => r.projectId === project.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((routine) => ({ routine, done: isDoneToday(routine, now) }));
      return { project, items, done: items.filter((i) => i.done).length };
    })
    .filter((g) => g.items.length > 0);
  return {
    groups,
    done: groups.reduce((s, g) => s + g.done, 0),
    total: groups.reduce((s, g) => s + g.items.length, 0),
  };
}
