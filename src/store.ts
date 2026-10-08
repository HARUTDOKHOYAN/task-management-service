import { create } from "zustand";
import { api } from "./api";
import type { Project, Task } from "./domain/types";

type FlagState = { id: number; text: string; undo?: () => void } | null;
type TaskInput = Pick<Task, "projectId" | "name" | "date" | "time" | "pinned">;
type ProjectInput = Pick<Project, "name" | "color" | "deadline">;

type State = {
  status: "loading" | "ready" | "error";
  now: Date;
  projects: Project[];
  tasks: Task[];
  open: Set<string>;
  flag: FlagState;
  taskDialog: { projectId?: string; taskId?: string } | null;
  projectDialog: { projectId?: string } | null;
  confirmDeleteProject: string | null;
  load: () => Promise<void>;
  tick: () => void;
  setDone: (id: string, done: boolean) => void;
  addTask: (t: TaskInput) => void;
  updateTask: (id: string, t: TaskInput) => void;
  deleteTask: (id: string) => void;
  addProject: (p: ProjectInput) => void;
  updateProject: (id: string, p: Partial<Pick<Project, "name" | "color" | "deadline" | "note">>) => void;
  deleteProject: (id: string) => void;
  toggleOpen: (id: string) => void;
  setAllOpen: (open: boolean) => void;
  showFlag: (text: string, undo?: () => void) => void;
  hideFlag: () => void;
  openTaskDialog: (opts?: { projectId?: string; taskId?: string }) => void;
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
    open: readOpen(),
    flag: null,
    taskDialog: null,
    projectDialog: null,
    confirmDeleteProject: null,

    load: async () => {
      set({ status: "loading" });
      try {
        const { projects, tasks } = await api.load();
        set({ projects, tasks, status: "ready", now: new Date() });
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
      const task: Task = { ...input, id: newId("t"), done: false, doneAt: null, createdAt: stamp, updatedAt: stamp };
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
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        tasks: s.tasks.filter((t) => t.projectId !== id),
      }));
      const open = new Set(get().open);
      open.delete(id);
      setOpen(open);
      persist(api.deleteProject(id), () =>
        set((s) => ({ projects: [...s.projects, old], tasks: [...s.tasks, ...oldTasks] })),
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
