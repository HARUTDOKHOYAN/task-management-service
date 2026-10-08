/* Priority rules (PLAN.md). Pure functions. "now" is always passed in. */
import { addDays, daysBetween, parseISO, startOfDay } from "./dates";
import type { Level, OpenLevel, Project, Task } from "./types";

export type Due = {
  date: Date;
  days: number;
  at: Date;
  hasTime: boolean;
  fromProject: boolean;
};

export type TaskInfo = {
  task: Task;
  due: Due | null;
  level: Level;
  overdue: boolean;
};

const NO_DUE = 8.64e15;
const ORDER: Record<Level, number> = { high: 0, medium: 1, low: 2, done: 3 };

export function dueOf(task: Task, project: Project | undefined, now: Date): Due | null {
  const dateStr = task.date ?? project?.deadline ?? null;
  if (!dateStr) return null;
  const date = parseISO(dateStr);
  const hasTime = Boolean(task.date && task.time);
  const at = new Date(date);
  if (hasTime && task.time) {
    const [h, m] = task.time.split(":").map(Number);
    at.setHours(h, m, 0, 0);
  } else {
    at.setHours(23, 59, 59, 999);
  }
  return { date, days: daysBetween(now, date), at, hasTime, fromProject: !task.date };
}

export function levelOf(task: Task, due: Due | null): Level {
  if (task.done) return "done";
  if (task.pinned) return "high";
  if (!due) return "low";
  if (due.days <= 1) return "high";
  if (due.days <= 3) return "medium";
  return "low";
}

export function isOverdue(task: Task, due: Due | null, now: Date): boolean {
  return !task.done && due !== null && due.at.getTime() < now.getTime();
}

export function infoOf(task: Task, projects: Project[], now: Date): TaskInfo {
  const due = dueOf(task, projects.find((p) => p.id === task.projectId), now);
  return { task, due, level: levelOf(task, due), overdue: isOverdue(task, due, now) };
}

export const dueTime = (x: TaskInfo) => (x.due ? x.due.at.getTime() : NO_DUE);

export function compareInfo(a: TaskInfo, b: TaskInfo): number {
  return ORDER[a.level] - ORDER[b.level] || dueTime(a) - dueTime(b);
}

export function sortTasks(list: TaskInfo[]): TaskInfo[] {
  return [...list].sort(compareInfo);
}

export type MainGroup = { project: Project; high: TaskInfo[]; medium: number; low: number };

export function groupForMain(
  tasks: Task[],
  projects: Project[],
  now: Date,
): { active: MainGroup[]; quiet: Project[] } {
  const open = tasks.map((t) => infoOf(t, projects, now)).filter((x) => x.level !== "done");
  const groups = projects.map((project) => {
    const mine = sortTasks(open.filter((x) => x.task.projectId === project.id));
    return {
      project,
      high: mine.filter((x) => x.level === "high"),
      medium: mine.filter((x) => x.level === "medium").length,
      low: mine.filter((x) => x.level === "low").length,
    };
  });
  const active = groups
    .filter((g) => g.high.length > 0)
    .sort((a, b) => dueTime(a.high[0]) - dueTime(b.high[0]));
  const quiet = groups.filter((g) => g.high.length === 0).map((g) => g.project);
  return { active, quiet };
}

export type LoadDay = { date: Date } & Record<OpenLevel, number>;

export function weekLoad(tasks: Task[], projects: Project[], now: Date): LoadDay[] {
  const today = startOfDay(now);
  const days: LoadDay[] = [0, 1, 2, 3, 4, 5, 6].map((i) => ({
    date: addDays(today, i),
    high: 0,
    medium: 0,
    low: 0,
  }));
  for (const t of tasks) {
    const x = infoOf(t, projects, now);
    if (x.level === "done" || !x.due || x.due.days > 6) continue;
    days[Math.max(0, x.due.days)][x.level] += 1; // overdue counts on today
  }
  return days;
}
