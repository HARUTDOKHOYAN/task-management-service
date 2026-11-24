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

/** All open High tasks from every project, earliest deadline first. */
export function highTasks(tasks: Task[], projects: Project[], now: Date): TaskInfo[] {
  return sortTasks(tasks.map((t) => infoOf(t, projects, now)).filter((x) => x.level === "high"));
}

export type LoadDay = { date: Date } & Record<OpenLevel, number>;

/** Open tasks per day for all projects. */
export function allLoad(tasks: Task[], projects: Project[], now: Date, count: number): LoadDay[] {
  return loadDays(tasks, projects, now, count);
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

/* ---------- Balance rules (PLAN.md) ----------
   score = √hours left × importance × waiting × deadline. The goal is a total of 0. */

/** How many projects the main page picks for today. */
export const FOCUS_COUNT = 2;
const WAIT_DAYS = 7; // the waiting factor grows by 1 every 7 days without work
const SOON_DAYS = 6; // "due this week": today and the next 6 days
const SOON_FACTOR = 1.5;
const FULL_RESET_MIN = 60; // a finished task of this size or more resets the waiting days

export type ProjectBalance = {
  project: Project;
  /** Open tasks, the next one first. */
  open: TaskInfo[];
  /** Work left: the sizes of the open tasks, added up. */
  minutes: number;
  /** Days since the last work on the project. */
  days: number;
  wait: number;
  /** An open task is due this week. */
  soon: boolean;
  urgency: number;
  score: number;
};

/** The tasks as they were at "now": later tasks do not exist yet, later "done" marks do not count. */
export function asOf(tasks: Task[], now: Date): Task[] {
  const at = now.getTime();
  return tasks
    .filter((t) => !t.createdAt || Date.parse(t.createdAt) <= at)
    .map((t) => (t.done && t.doneAt && Date.parse(t.doneAt) > at ? { ...t, done: false, doneAt: null } : t));
}

/** Days since the last work. A finished task of 1 hour or more resets the count; a smaller task lowers it in part. */
export function daysWaiting(project: Project, tasks: Task[], now: Date): number {
  if (!project.createdAt) return 0;
  const work = tasks
    .flatMap((t) => (t.projectId === project.id && t.done && t.doneAt ? [{ at: Date.parse(t.doneAt), size: t.size }] : []))
    .sort((a, b) => a.at - b.at);
  let anchor = Date.parse(project.createdAt);
  for (const w of work) {
    const keep = 1 - Math.min(w.size, FULL_RESET_MIN) / FULL_RESET_MIN;
    anchor = Math.max(anchor, w.at - (w.at - anchor) * keep);
  }
  return Math.max(0, daysBetween(new Date(anchor), now));
}

const nextFirst = (a: TaskInfo, b: TaskInfo) =>
  compareInfo(a, b) || a.task.size - b.task.size || a.task.createdAt.localeCompare(b.task.createdAt);

/** Balance of one project. Pass tasks from asOf(). */
export function balanceOf(project: Project, tasks: Task[], projects: Project[], now: Date): ProjectBalance {
  const open = tasks
    .filter((t) => t.projectId === project.id && !t.done)
    .map((t) => infoOf(t, projects, now))
    .sort(nextFirst);
  const minutes = open.reduce((sum, x) => sum + x.task.size, 0);
  const days = daysWaiting(project, tasks, now);
  const wait = 1 + days / WAIT_DAYS;
  const soon = open.some((x) => x.due !== null && x.due.days <= SOON_DAYS);
  const urgency = soon ? SOON_FACTOR : 1;
  const score = project.paused ? 0 : Math.sqrt(minutes / 60) * project.importance * wait * urgency;
  return { project, open, minutes, days, wait, soon, urgency, score };
}

/** Every project with its score, the highest first. Same score: the more important project first. */
export function balance(tasks: Task[], projects: Project[], now: Date): { rows: ProjectBalance[]; total: number } {
  const view = asOf(tasks, now);
  const rows = projects
    .map((p) => balanceOf(p, view, projects, now))
    .sort((a, b) => b.score - a.score || b.project.importance - a.project.importance);
  return { rows, total: rows.reduce((sum, r) => sum + r.score, 0) };
}

export type Plan = {
  /** Projects to work on today. */
  focus: ProjectBalance[];
  /** Projects with a score that are not for today. */
  waiting: ProjectBalance[];
  /** Projects with score 0: no open tasks, or paused. */
  zero: ProjectBalance[];
  /** Open High tasks from all projects. They never wait for the score. */
  due: TaskInfo[];
  /** Today's plan: the High tasks, plus the next task of each project for today. */
  tasks: TaskInfo[];
  minutes: number;
  total: number;
  /** The total when today's plan is done. */
  after: number;
};

export function planToday(tasks: Task[], projects: Project[], now: Date): Plan {
  const { rows, total } = balance(tasks, projects, now);
  const active = rows.filter((r) => r.score > 0);
  const focus = active.slice(0, FOCUS_COUNT);
  const due = highTasks(asOf(tasks, now), projects, now);
  const next = focus.flatMap((r) => r.open.filter((x) => x.level !== "high").slice(0, 1));
  const plan = [...due, ...next];
  const ids = new Set(plan.map((x) => x.task.id));
  const stamp = now.toISOString();
  const done = tasks.map((t) => (ids.has(t.id) ? { ...t, done: true, doneAt: stamp } : t));
  return {
    focus,
    waiting: active.slice(FOCUS_COUNT),
    zero: rows.filter((r) => r.score === 0),
    due,
    tasks: plan,
    minutes: plan.reduce((sum, x) => sum + x.task.size, 0),
    total,
    after: balance(done, projects, now).total,
  };
}

/** The total at the end of each of the last days. The last entry is today, at "now". */
export function balanceTrend(tasks: Task[], projects: Project[], now: Date, count: number): { date: Date; total: number }[] {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const back = count - 1 - i;
    const date = addDays(today, -back);
    const at = back === 0 ? now : new Date(addDays(date, 1).getTime() - 1);
    return { date, total: balance(tasks, projects, at).total };
  });
}
