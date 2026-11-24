import { describe, expect, it } from "vitest";
import { dailyGroups, isDoneToday, toggledDoneOn } from "./daily";
import type { Project, Routine } from "./types";

const P: Project = { id: "p", name: "P", color: "#1868DB", deadline: "2026-10-12", importance: 2, paused: false, note: "", createdAt: "", updatedAt: "" };
const Q: Project = { ...P, id: "q", name: "Q" };
const now = new Date(2026, 9, 8, 15, 0); // Thu 8 Oct 2026, 15:00

function job(over: Partial<Routine> = {}): Routine {
  return { id: "r", projectId: "p", name: "R", doneOn: null, createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "", ...over };
}

describe("daily checklist", () => {
  it("a job is done only on the day it was checked", () => {
    expect(isDoneToday(job(), now)).toBe(false);
    expect(isDoneToday(job({ doneOn: "2026-10-08" }), now)).toBe(true);
    expect(isDoneToday(job({ doneOn: "2026-10-07" }), now)).toBe(false);
  });
  it("checks reset at midnight", () => {
    const r = job({ doneOn: "2026-10-08" });
    expect(isDoneToday(r, new Date(2026, 9, 8, 23, 59))).toBe(true);
    expect(isDoneToday(r, new Date(2026, 9, 9, 0, 0))).toBe(false);
  });

  it("toggle sets today, or clears it", () => {
    expect(toggledDoneOn(job(), now)).toBe("2026-10-08");
    expect(toggledDoneOn(job({ doneOn: "2026-10-07" }), now)).toBe("2026-10-08");
    expect(toggledDoneOn(job({ doneOn: "2026-10-08" }), now)).toBeNull();
  });

  it("groups jobs by project, in project order, oldest job first", () => {
    const list = [
      job({ id: "b", projectId: "q", createdAt: "2026-10-02T10:00:00.000Z" }),
      job({ id: "a2", projectId: "p", createdAt: "2026-10-03T10:00:00.000Z", doneOn: "2026-10-08" }),
      job({ id: "a1", projectId: "p", createdAt: "2026-10-01T10:00:00.000Z" }),
      job({ id: "x", projectId: "gone" }),
    ];
    const { groups, done, total } = dailyGroups(list, [P, Q], now);
    expect(groups.map((g) => g.project.id)).toEqual(["p", "q"]);
    expect(groups[0].items.map((i) => [i.routine.id, i.done])).toEqual([["a1", false], ["a2", true]]);
    expect(groups[0].done).toBe(1);
    expect(groups[1].done).toBe(0);
    expect([done, total]).toEqual([1, 3]);
  });
  it("projects without jobs are left out", () => {
    expect(dailyGroups([], [P, Q], now)).toEqual({ groups: [], done: 0, total: 0 });
  });
});
