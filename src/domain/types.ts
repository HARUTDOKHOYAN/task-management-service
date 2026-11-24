/* Task size in minutes. The balance score adds them up as hours left. */
export const SIZES = [10, 30, 60, 120, 180, 240] as const;
export type Size = (typeof SIZES)[number];
export const DEFAULT_SIZE: Size = 60;

/* Project importance: the coefficient in the balance score. */
export type Importance = 1 | 2 | 3;
export const IMPORTANCES: Importance[] = [3, 2, 1];
export const DEFAULT_IMPORTANCE: Importance = 2;
export const IMPORTANCE_LABEL: Record<Importance, string> = { 3: "High", 2: "Normal", 1: "Low" };

export type Project = {
  id: string;
  name: string;
  color: string;
  deadline: string | null; // "YYYY-MM-DD"; null = no deadline
  importance: Importance; // how much attention the project needs, used by the balance score
  paused: boolean; // a paused project has score 0
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Task = {
  id: string;
  projectId: string;
  name: string;
  date: string | null; // "YYYY-MM-DD"; null = project deadline
  time: string | null; // "HH:MM"; null = end of day
  size: Size; // minutes of work
  pinned: boolean;
  done: boolean;
  doneAt: string | null;
  archivedAt: string | null; // set when a done task goes to the Archive page
  createdAt: string;
  updatedAt: string;
};

/* Daily job for a project, for example "Check Bugsnag". Shows every day; checks reset at midnight. */
export type Routine = {
  id: string;
  projectId: string;
  name: string;
  doneOn: string | null; // "YYYY-MM-DD" of the last day it was checked
  createdAt: string;
  updatedAt: string;
};

/* Mini task for free time: no project, no deadline, no priority. */
export type FreeTask = {
  id: string;
  name: string;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Level ="high" | "medium" | "low" | "done";
export type OpenLevel = Exclude<Level, "done">;

export const LEVEL_LABEL: Record<Level, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  done: "Done",
};

/* Atlassian accent "bolder" colors. Never red: red means High priority. */
export const COLORS = [
  { id: "blue", label: "Blue", hex: "#1868DB" },
  { id: "purple", label: "Purple", hex: "#964AC0" },
  { id: "teal", label: "Teal", hex: "#227D9B" },
  { id: "green", label: "Green", hex: "#1F845A" },
  { id: "lime", label: "Lime", hex: "#5B7F24" },
  { id: "orange", label: "Orange", hex: "#BD5B00" },
  { id: "magenta", label: "Magenta", hex: "#AE4787" },
  { id: "yellow", label: "Yellow", hex: "#946F00" },
  { id: "gray", label: "Gray", hex: "#6B6E76" },
] as const;
