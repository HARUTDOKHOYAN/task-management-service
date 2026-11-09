/* Free time list: mini tasks with no deadline, no project and no priority. Pure functions. */
import { daysBetween } from "./dates";
import type { FreeTask } from "./types";

/** Open mini tasks, newest first. */
export function openFreeTasks(list: FreeTask[]): FreeTask[] {
  return list.filter((t) => !t.done).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** One task at random. Does not repeat the last pick when there is a choice. `rand` returns 0 to 1. */
export function pickFree(list: FreeTask[], lastId: string | null, rand: () => number): FreeTask | null {
  if (list.length === 0) return null;
  const pool = list.length > 1 ? list.filter((t) => t.id !== lastId) : list;
  return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))];
}

export function addedLabel(createdAt: string, now: Date): string {
  const days = daysBetween(new Date(createdAt), now);
  if (days <= 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 14) return `Added ${days} days ago`;
  return `Added ${Math.floor(days / 7)} weeks ago`;
}
