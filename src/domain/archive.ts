/* Archive: done tasks the user put away. They leave every list and live on the Archive page. Pure functions. */
import type { Project, Task } from "./types";

export const canArchive = (t: Task) => t.done && !t.archivedAt;

/** Archived tasks are kept apart, so priority, week load and project lists never see them. */
export function splitArchived(tasks: Task[]): { active: Task[]; archived: Task[] } {
  return {
    active: tasks.filter((t) => !t.archivedAt),
    archived: tasks.filter((t) => !!t.archivedAt),
  };
}

export type ArchiveGroup = { project: Project; tasks: Task[] };

const newest = (a: Task, b: Task) => String(b.archivedAt).localeCompare(String(a.archivedAt));

/** Archived tasks per project. Newest archive first, in each group and between groups. */
export function archiveGroups(archived: Task[], projects: Project[]): ArchiveGroup[] {
  return projects
    .map((project) => ({ project, tasks: archived.filter((t) => t.projectId === project.id).sort(newest) }))
    .filter((g) => g.tasks.length > 0)
    .sort((a, b) => newest(a.tasks[0], b.tasks[0]));
}
