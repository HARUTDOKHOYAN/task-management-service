import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, Task } from "./domain/types";

vi.mock("./api", () => ({
  api: {
    load: vi.fn(),
    saveTask: vi.fn(() => Promise.resolve()),
    deleteProject: vi.fn(() => Promise.resolve()),
    deleteTask: vi.fn(() => Promise.resolve()),
    saveRoutine: vi.fn(() => Promise.resolve()),
    deleteRoutine: vi.fn(() => Promise.resolve()),
  },
}));

const { api } = await import("./api");
const { useStore } = await import("./store");

const P: Project = { id: "p", name: "P", color: "#1868DB", deadline: "2026-10-12", note: "", createdAt: "", updatedAt: "" };
function task(over: Partial<Task> = {}): Task {
  return { id: "t", projectId: "p", name: "T", date: null, time: null, pinned: false, done: false, doneAt: null, archivedAt: null, createdAt: "", updatedAt: "", ...over };
}

describe("store archive", () => {
  beforeEach(async () => {
    vi.mocked(api.load).mockResolvedValue({
      projects: [P],
      tasks: [
        task({ id: "open" }),
        task({ id: "done", done: true, doneAt: "2026-10-07T10:00:00.000Z" }),
        task({ id: "old", done: true, archivedAt: "2026-10-01T10:00:00.000Z" }),
      ],
    });
    await useStore.getState().load();
  });

  it("loads archived tasks apart from the others", () => {
    const s = useStore.getState();
    expect(s.tasks.map((t) => t.id)).toEqual(["open", "done"]);
    expect(s.archived.map((t) => t.id)).toEqual(["old"]);
  });

  it("archives only done tasks", () => {
    useStore.getState().archiveTasks(["open", "done"]);
    const s = useStore.getState();
    expect(s.tasks.map((t) => t.id)).toEqual(["open"]);
    expect(s.archived.map((t) => t.id).sort()).toEqual(["done", "old"]);
    expect(s.archived.find((t) => t.id === "done")!.archivedAt).not.toBeNull();
    expect(api.saveTask).toHaveBeenCalled();
  });

  it("undo puts the task back", () => {
    useStore.getState().archiveTasks(["done"]);
    useStore.getState().flag!.undo!();
    const s = useStore.getState();
    expect(s.tasks.map((t) => t.id).sort()).toEqual(["done", "open"]);
    expect(s.archived.map((t) => t.id)).toEqual(["old"]);
  });

  it("restore moves a task back to its project, still done", () => {
    useStore.getState().restoreTask("old");
    const s = useStore.getState();
    const back = s.tasks.find((t) => t.id === "old")!;
    expect(back.archivedAt).toBeNull();
    expect(back.done).toBe(true);
    expect(s.archived).toHaveLength(0);
  });

  it("deleting a project also removes its archived tasks", () => {
    useStore.getState().deleteProject("p");
    const s = useStore.getState();
    expect(s.tasks).toHaveLength(0);
    expect(s.archived).toHaveLength(0);
    expect(api.deleteProject).toHaveBeenCalledWith("p");
  });
});

describe("store delete from archive", () => {
  it("removes an archived task for good", async () => {
    vi.mocked(api.load).mockResolvedValue({ projects: [P], tasks: [task({ id: "old", done: true, archivedAt: "2026-10-01T10:00:00.000Z" })] });
    await useStore.getState().load();
    useStore.getState().deleteArchived("old");
    expect(useStore.getState().archived).toHaveLength(0);
    expect(api.deleteTask).toHaveBeenCalledWith("old");
  });
  it("does not touch tasks that are not archived", async () => {
    vi.mocked(api.load).mockResolvedValue({ projects: [P], tasks: [task({ id: "open" })] });
    await useStore.getState().load();
    useStore.getState().deleteArchived("open");
    expect(useStore.getState().tasks).toHaveLength(1);
  });
});

describe("store daily jobs", () => {
  beforeEach(async () => {
    vi.mocked(api.load).mockResolvedValue({
      projects: [P],
      tasks: [],
      routines: [{ id: "r", projectId: "p", name: "Check Bugsnag", doneOn: null, createdAt: "", updatedAt: "" }],
    });
    await useStore.getState().load();
  });
  it("toggle checks and unchecks for today", () => {
    useStore.getState().toggleRoutine("r");
    expect(useStore.getState().routines[0].doneOn).not.toBeNull();
    useStore.getState().toggleRoutine("r");
    expect(useStore.getState().routines[0].doneOn).toBeNull();
    expect(api.saveRoutine).toHaveBeenCalled();
  });
  it("delete has undo", () => {
    useStore.getState().deleteRoutine("r");
    expect(useStore.getState().routines).toHaveLength(0);
    useStore.getState().flag!.undo!();
    expect(useStore.getState().routines).toHaveLength(1);
  });
  it("deleting a project also removes its daily jobs", () => {
    useStore.getState().deleteProject("p");
    expect(useStore.getState().routines).toHaveLength(0);
  });
});
