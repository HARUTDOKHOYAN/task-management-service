import { create } from "zustand";
import { api } from "./api";
import { canArchive, splitArchived } from "./domain/archive";
import { toggledDoneOn } from "./domain/daily";
import type { FreeTask, Project, Routine, Task } from "./domain/types";

type FlagState = { id: number; text: string; undo?: () => void } | null;
type TaskInput = Pick<Task, "projectId" | "name" | "date" | "time" | "pinned">;
type ProjectInput = Pick<Project, "name" | "color" | "deadline">;

type State = {
  status: "loading" | "ready" | "error";
  now: Date;
  projects: Project[];
  /** Tasks not archived. Every list and priority function uses these. */
  tasks: Task[];
  /** Done tasks on the Archive page. */
  archived: Task[];
  freeTasks: FreeTask[];
  routines: Routine[];
  open: Set<string>;
  flag: FlagState;
  taskDialog: { projectId?: string; taskId?: string; date?: string } | null;
  projectDialog: { projectId?: string } | null;
  confirmDeleteProject: string | null;
  load: () => Promise<void>;
  tick: () => void;
  setDone: (id: string, done: boolean) => void;
  addTask: (t: TaskInput) => void;
  updateTask: (id: string, t: TaskInput) => void;
  deleteTask: (id: string) => void;
  archiveTasks: (ids: string[]) => void;
  restoreTask: (id: string) => void;
  deleteArchived: (id: string) => void;
  addRoutine: (projectId: string, name: string) => void;
  toggleRoutine: (id: string) => void;
  deleteRoutine: (id: string) => void;
  addFreeTask: (name: string) => void;
  setFreeDone: (id: string, done: boolean) => void;
  addProject: (p: ProjectInput) => void;
  updateProject: (id: string, p: Partial<Pick<Project, "name" | "color" | "deadline" | "note">>) => void;
  deleteProject: (id: string) => void;
  toggleOpen: (id: string) => void;
  setAllOpen: (open: boolean) => void;
  showFlag: (text: string, undo?: () => void) => void;
  hideFlag: () => void;
  openTaskDialog: (opts?: { projectId?: string; taskId?: string; date?: string }) => void;
  openProjectDialog: (projectId?: string) => void;
  askDeleteProject: (id: string | null) => void;
  closeDialogs: () => void;
};

/* Open accordion items are remembered in this browser only. */
const OPEN_KEY = "focus-list:open";
function readOpen(): Set<string> {
  try {
    const raw = localStorage.getItem(OPEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeOpen(open: Set<string>) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify([...open]));
  } catch {
    /* storage blocked: not important */
  }
}

let flagSeq = 0;
const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const stampNow = () => new Date().toISOString();

export const useStore = create<State>((set, get) => {
  const replaceTask = (task: Task) =>
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) }));
  const replaceFree = (task: FreeTask) =>
    set((s) => ({ freeTasks: s.freeTasks.map((t) => (t.id === task.id ? task : t)) }));
  const replaceRoutine = (routine: Routine) =>
    set((s) => ({ routines: s.routines.map((r) => (r.id === routine.id ? routine : r)) }));
  const replaceProject = (project: Project) =>
    set((s) => ({ projects: s.projects.map((p) => (p.id === project.id ? project : p)) }));
  const setOpen = (open: Set<string>) => {
    writeOpen(open);
    set({ open });
  };

  return {
    status: "loading",
    now: new Date(),
    projects: [],
    tasks: [],
    archived: [],
    freeTasks: [],
    routines: [],
    open: readOpen(),
    flag: null,
    taskDialog: null,
    projectDialog: null,
    confirmDeleteProject: null,

    load: async () => {
      set({ status: "loading" });
      try {
        const { projects, tasks: all, freeTasks = [], routines = [] } = await api.load();
        const { active: tasks, archived } = splitArchived(all.map((t) => ({ ...t, archivedAt: t.archivedAt ?? null })));
        set({ projects, tasks, archived, freeTasks, routines, status: "ready", now: new Date() });
      } catch {
        set({ status: "error" });
      }
    },
    tick: () => set({ now: new Date() }),

    setDone: (id, done) => {
      const old = get().tasks.find((t) => t.id === id);
      if (!old) return;
      const stamp = stampNow();
      const task: Task = { ...old, done, doneAt: done ? stamp : null, updatedAt: stamp };
      replaceTask(task);
      persist(api.saveTask(task), () => replaceTask(old));
      if (done) get().showFlag(`Task done: ${task.name}`, () => get().setDone(id, false));
    },

    addTask: (input) => {
      const stamp = stampNow();
      const task: Task = { ...input, id: newId("t"), done: false, doneAt: null, archivedAt: null, createdAt: stamp, updatedAt: stamp };
      set((s) => ({ tasks: [...s.tasks, task] }));
      persist(api.saveTask(task), () => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== task.id) })));
      get().showFlag(`Task created: ${task.name}`);
    },

    updateTask: (id, input) => {
      const old = get().tasks.find((t) => t.id === id);
      if (!old) return;
      const task: Task = { ...old, ...input, updatedAt: stampNow() };
      replaceTask(task);
      persist(api.saveTask(task), () => replaceTask(old));
      get().showFlag(`Task saved: ${task.name}`);
    },

    deleteTask: (id) => {
      const old = get().tasks.find((t) => t.id === id);
      if (!old) return;
      const restore = () => {
        set((s) => ({ tasks: [...s.tasks, old] }));
        persist(api.saveTask(old), () => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })));
      };
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      persist(api.deleteTask(id), () => set((s) => ({ tasks: [...s.tasks, old] })));
      get().showFlag(`Task deleted: ${old.name}`, restore);
    },

    archiveTasks: (ids) => {
      const old = get().tasks.filter((t) => ids.includes(t.id) && canArchive(t));
      if (old.length === 0) return;
      const stamp = stampNow();
      const moved = old.map((t) => ({ ...t, archivedAt: stamp, updatedAt: stamp }));
      const movedIds = new Set(moved.map((t) => t.id));
      const putBack = () =>
        set((s) => ({ tasks: [...s.tasks, ...old], archived: s.archived.filter((t) => !movedIds.has(t.id)) }));
      set((s) => ({ tasks: s.tasks.filter((t) => !movedIds.has(t.id)), archived: [...s.archived, ...moved] }));
      persist(Promise.all(moved.map((t) => api.saveTask(t))), putBack);
      const undo = () => {
        putBack();
        persist(Promise.all(old.map((t) => api.saveTask(t))), () =>
          set((s) => ({ tasks: s.tasks.filter((t) => !movedIds.has(t.id)), archived: [...s.archived, ...moved] })),
        );
      };
      get().showFlag(moved.length === 1 ? `Task archived: ${moved[0].name}` : `${moved.length} tasks archived`, undo);
    },

    restoreTask: (id) => {
      const old = get().archived.find((t) => t.id === id);
      if (!old) return;
      const task: Task = { ...old, archivedAt: null, updatedAt: stampNow() };
      set((s) => ({ archived: s.archived.filter((t) => t.id !== id), tasks: [...s.tasks, task] }));
      persist(api.saveTask(task), () =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), archived: [...s.archived, old] })),
      );
      get().showFlag(`Task restored: ${task.name}`);
    },

    /* Removes an archived task for good. The page asks the user first. */
    deleteArchived: (id) => {
      const old = get().archived.find((t) => t.id === id);
      if (!old) return;
      set((s) => ({ archived: s.archived.filter((t) => t.id !== id) }));
      persist(api.deleteTask(id), () => set((s) => ({ archived: [...s.archived, old] })));
      get().showFlag(`Deleted for good: ${old.name}`);
    },

    addRoutine: (projectId, name) => {
      const stamp = stampNow();
      const routine: Routine = { id: newId("r"), projectId, name, doneOn: null, createdAt: stamp, updatedAt: stamp };
      set((s) => ({ routines: [...s.routines, routine] }));
      persist(api.saveRoutine(routine), () => set((s) => ({ routines: s.routines.filter((r) => r.id !== routine.id) })));
      get().showFlag(`Daily job added: ${routine.name}`);
    },

    toggleRoutine: (id) => {
      const old = get().routines.find((r) => r.id === id);
      if (!old) return;
      const routine: Routine = { ...old, doneOn: toggledDoneOn(old, new Date()), updatedAt: stampNow() };
      replaceRoutine(routine);
      persist(api.saveRoutine(routine), () => replaceRoutine(old));
    },

    deleteRoutine: (id) => {
      const old = get().routines.find((r) => r.id === id);
      if (!old) return;
      const restore = () => {
        set((s) => ({ routines: [...s.routines, old] }));
        persist(api.saveRoutine(old), () => set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })));
      };
      set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
      persist(api.deleteRoutine(id), () => set((s) => ({ routines: [...s.routines, old] })));
      get().showFlag(`Daily job deleted: ${old.name}`, restore);
    },

    addFreeTask: (name) => {
      const stamp = stampNow();
      const task: FreeTask = { id: newId("f"), name, done: false, doneAt: null, createdAt: stamp, updatedAt: stamp };
      set((s) => ({ freeTasks: [...s.freeTasks, task] }));
      persist(api.saveFreeTask(task), () => set((s) => ({ freeTasks: s.freeTasks.filter((t) => t.id !== task.id) })));
      get().showFlag(`Added to Free time: ${task.name}`);
    },

    setFreeDone: (id, done) => {
      const old = get().freeTasks.find((t) => t.id === id);
      if (!old) return;
      const stamp = stampNow();
      const task: FreeTask = { ...old, done, doneAt: done ? stamp : null, updatedAt: stamp };
      replaceFree(task);
      persist(api.saveFreeTask(task), () => replaceFree(old));
      if (done) get().showFlag(`Task done: ${task.name}`, () => get().setFreeDone(id, false));
    },

    addProject: (input) => {
      const stamp = stampNow();
      const project: Project = { ...input, id: newId("p"), note: "", createdAt: stamp, updatedAt: stamp };
      set((s) => ({ projects: [...s.projects, project] }));
      setOpen(new Set(get().open).add(project.id));
      persist(api.saveProject(project), () =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== project.id) })),
      );
      get().showFlag(`Project created: ${project.name}`);
    },

    updateProject: (id, patch) => {
      const old = get().projects.find((p) => p.id === id);
      if (!old) return;
      const project: Project = { ...old, ...patch, updatedAt: stampNow() };
      replaceProject(project);
      persist(api.saveProject(project), () => replaceProject(old));
    },

    deleteProject: (id) => {
      const old = get().projects.find((p) => p.id === id);
      if (!old) return;
      const oldTasks = get().tasks.filter((t) => t.projectId === id);
      const oldArchived = get().archived.filter((t) => t.projectId === id);
      const oldRoutines = get().routines.filter((r) => r.projectId === id);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.filter((t) => t.projectId !== id),
        archived: s.archived.filter((t) => t.projectId !== id),
        routines: s.routines.filter((r) => r.projectId !== id),
      }));
      const open = new Set(get().open);
      open.delete(id);
      setOpen(open);
      persist(api.deleteProject(id), () =>
        set((s) => ({ projects: [...s.projects, old], tasks: [...s.tasks, ...oldTasks], archived: [...s.archived, ...oldArchived], routines: [...s.routines, ...oldRoutines] })),
      );
      get().showFlag(`Project deleted: ${old.name}`);
    },

    toggleOpen: (id) => {
      const open = new Set(get().open);
      if (open.has(id)) open.delete(id);
      else open.add(id);
      setOpen(open);
    },
    setAllOpen: (isOpen) => setOpen(isOpen ? new Set(get().projects.map((p) => p.id)) : new Set()),

    showFlag: (text, undo) => set({ flag: { id: ++flagSeq, text, undo } }),
    hideFlag: () => set({ flag: null }),
    openTaskDialog: (opts) => set({ taskDialog: opts ?? {} }),
    openProjectDialog: (projectId) => set({ projectDialog: { projectId } }),
    askDeleteProject: (id) => set({ confirmDeleteProject: id }),
    closeDialogs: () => set({ taskDialog: null, projectDialog: null, confirmDeleteProject: null }),
  };
});

/* Show the change at once, save in the background. On failure, roll back and tell the user. */
function persist(save: Promise<unknown>, rollback: () => void) {
  save.catch(() => {
    rollback();
    useStore.getState().showFlag("Could not save. Check the server and try again.");
  });
}
