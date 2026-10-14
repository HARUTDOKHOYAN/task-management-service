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

export type MainGroup = { project: Project; top: TaskInfo[]; high: TaskInfo[]; medium: number; low: number; open: number };

/** Projects with open tasks, each with its top 3 tasks. Most urgent project first. */
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
      top: mine.slice(0, 3),
      high: mine.filter((x) => x.level === "high"),
      medium: mine.filter((x) => x.level === "medium").length,
      low: mine.filter((x) => x.level === "low").length,
      open: mine.length,
    };
  });
  const active = groups.filter((g) => g.open > 0).sort((a, b) => compareInfo(a.top[0], b.top[0]));
  const quiet = groups.filter((g) => g.open === 0).map((g) => g.project);
  return { active, quiet };
}

export type LoadDay = { date: Date } & Record<OpenLevel, number>;

export function weekLoad(tasks: Task[], projects: Project[], now: Date): LoadDay[] {
  return loadDays(tasks, projects, now, 7);
}

/** Open tasks per day for one project. Helps choose a quiet day for a new task. */
export function projectLoad(tasks: Task[], projects: Project[], projectId: string, now: Date, count: number): LoadDay[] {
  return loadDays(tasks.filter((t) => t.projectId === projectId), projects, now, count);
}

function loadDays(tasks: Task[], projects: Project[], now: Date, count: number): LoadDay[] {
  const today = startOfDay(now);
  const days: LoadDay[] = Array.from({ length: count }, (_, i) => ({
    date: addDays(today, i),
    high: 0,
    medium: 0,
    low: 0,
  }));
  for (const t of tasks) {
    const x = infoOf(t, projects, now);
    if (x.level === "done" || !x.due || x.due.days >= count) continue;
    days[Math.max(0, x.due.days)][x.level] += 1; // overdue counts on today
  }
  return days;
}
