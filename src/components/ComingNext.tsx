import { fmtDay } from "../domain/dates";
import { sortTasks, type TaskInfo } from "../domain/priority";
import type { Project } from "../domain/types";
import { Tile } from "./ui";

export function ComingNext({ open, projects }: { open: TaskInfo[]; projects: Project[] }) {
  const next = sortTasks(open.filter((x) => x.level === "medium")).slice(0, 3);
  return (
    <section className="card card--pad">
      <h2 className="card-title" style={{ marginBottom: 12 }}>Coming next</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {next.length === 0 && <p className="muted" style={{ margin: 0 }}>Nothing in the next 2-3 days.</p>}
        {next.map((x) => {
          const p = projects.find((q) => q.id === x.task.projectId);
          return (
            <div className="next-item" key={x.task.id}>
              <Tile color={p?.color ?? "#6B6E76"} size="sm" />
              <div>
                <div>{x.task.name}</div>
                <div className="small muted">{p?.name}{x.due ? `, ${fmtDay(x.due.date)}` : ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
