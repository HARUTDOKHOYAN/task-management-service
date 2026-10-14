import type { TaskInfo } from "../domain/priority";
import type { Project } from "../domain/types";
import { TaskRow } from "./TaskRow";
import { Tile } from "./ui";

export function TopTasks({ top, projects }: { top: TaskInfo[]; projects: Project[] }) {
  if (top.length === 0) return null;
  return (
    <section className="card group" aria-labelledby="topTitle">
      <div className="group-head">
        <h2 id="topTitle">Top {top.length} to do now</h2>
        <span className="group-next muted">By priority, then deadline</span>
      </div>
      {top.map((x) => {
        const p = projects.find((pr) => pr.id === x.task.projectId);
        return (
          <div className="top-task" key={x.task.id}>
            {p && <span className="top-task__project small muted"><Tile color={p.color} size="sm" /> {p.name}</span>}
            <TaskRow x={x} showLevel />
          </div>
        );
      })}
    </section>
  );
}
