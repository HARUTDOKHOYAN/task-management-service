import { useNavigate } from "react-router-dom";
import { dueMain } from "../domain/format";
import type { MainGroup } from "../domain/priority";
import { useStore } from "../store";
import { TaskRow } from "./TaskRow";
import { Lozenge, NextStep, Tile } from "./ui";

export function ProjectGroup({ group }: { group: MainGroup }) {
  const { project: p, high } = group;
  const first = high[0];
  const navigate = useNavigate();
  const openProject = () => {
    const s = useStore.getState();
    if (!s.open.has(p.id)) s.toggleOpen(p.id);
    navigate("/projects");
  };
  return (
    <section className="card group" aria-labelledby={`g-${p.id}`}>
      <div className="group-head">
        <Tile color={p.color} />
        <h2 id={`g-${p.id}`}>{p.name}</h2>
        <Lozenge level="high" text={`${high.length} High`} />
        <span className="group-next">
          Next due{" "}
          <strong className={first.overdue ? "is-late" : ""}>
            {first.overdue ? `${dueMain(first)} (overdue)` : dueMain(first)}
          </strong>
        </span>
      </div>
      <NextStep note={p.note} />
      {high.map((x) => <TaskRow key={x.task.id} x={x} />)}
      <div className="group-foot">
        <button className="link-btn" type="button" onClick={openProject}>Open project</button>
        <span className="muted">{group.medium} Medium, {group.low} Low</span>
      </div>
    </section>
  );
}
