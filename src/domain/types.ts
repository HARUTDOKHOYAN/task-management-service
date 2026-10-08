export type Project = {
  id: string;
  name: string;
  color: string;
  deadline: string; // "YYYY-MM-DD"
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
  pinned: boolean;
  done: boolean;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Level = "high" | "medium" | "low" | "done";
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
