import { daysBetween, fmtDay, parseISO } from "./dates";
import type { TaskInfo } from "./priority";

export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function dueMain(x: TaskInfo): string {
  if (!x.due) return "No date";
  const time = x.due.hasTime ? ` ${x.task.time}` : "";
  const d = x.due.days;
  if (d === 0) return "Today" + time;
  if (d === 1) return "Tomorrow" + time;
  if (d === -1) return "Yesterday" + time;
  if (d < -1) return `${-d} days ago${time}`;
  return fmtDay(x.due.date) + time;
}

export function dueSub(x: TaskInfo): string {
  if (!x.due) return "";
  const d = x.due.days;
  let s = d > 1 ? `in ${d} days` : fmtDay(x.due.date);
  if (!x.due.hasTime && Math.abs(d) <= 1) s += ", end of day";
  if (x.due.fromProject) s += " (project)";
  return s;
}

export function deadlineLabel(dateStr: string, now: Date): string {
  const d = parseISO(dateStr);
  const days = daysBetween(now, d);
  const when =
    days < 0 ? `${-days} days late` : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return `${fmtDay(d)} (${when})`;
}
