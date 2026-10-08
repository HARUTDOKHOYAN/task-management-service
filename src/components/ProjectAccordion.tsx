import { deadlineLabel } from "../domain/format";
import { infoOf, sortTasks } from "../domain/priority";
import { LEVEL_LABEL, type OpenLevel, type Project, type Task } from "../domain/types";
import { useStore } from "../store";
import { TaskRow } from "./TaskRow";
import { NoteEditor } from "./NoteEditor";
import { ChevronIcon, Lozenge, Tile } from "./ui";

type Props = { project: Project; tasks: Task[]; projects: Project[]; now: Date; isOpen: boolean };

export function ProjectAccordion({ project: p, tasks, projects, now, isOpen }: Props) {
  const toggleOpen = useStore((s) => s.toggleOpen);
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  const openProjectDialog = useStore((s) => s.openProjectDialog);
  const askDeleteProject = useStore((s) => s.askDeleteProject);
  const list = sortTasks(tasks.filter((t) => t.projectId === p.id).map((t) => infoOf(t, projects, now)));
  const count = (lv: string) => list.filter((x) => x.level === lv).length;
  const done = count("done");
  const pct = list.length ? Math.round((done / list.length) * 100) : 0;
  const levels: OpenLevel[] = ["high", "medium", "low"];
  return (
    <section className="card">
      <h2 className="acc-head">
        <button
          className="acc-btn"
          type="button"
          id={`head-${p.id}`}
          aria-expanded={isOpen}
          aria-controls={`panel-${p.id}`}
          onClick={() => toggleOpen(p.id)}
        >
          <ChevronIcon />
          <Tile color={p.color} />
          <span className="acc-title">
            <b>{p.name}</b>
            <span className="small muted">Deadline {deadlineLabel(p.deadline, now)}</span>
          </span>
          <span className="acc-counts">
            {levels.filter((lv) => count(lv)).map((lv) => (
              <Lozenge key={lv} level={lv} text={`${count(lv)} ${LEVEL_LABEL[lv]}`} />
            ))}
          </span>
          <span className="acc-progress">
            <span className="small" style={{ color: "#505258" }}>{done} of {list.length} done</span>
            <span className="progress"><span style={{ width: `${pct}%` }} /></span>
          </span>
        </button>
      </h2>
      {isOpen && (
        <div className="acc-panel" id={`panel-${p.id}`} role="region" aria-labelledby={`head-${p.id}`}>
          <NoteEditor project={p} />
          {list.length ? (
            list.map((x) => <TaskRow key={x.task.id} x={x} showLevel={x.level !== "done"} />)
          ) : (
            <div className="empty">No tasks yet.</div>
          )}
          <div className="group-foot">
            <span className="acc-actions">
              <button className="link-btn" type="button" onClick={() => openTaskDialog({ projectId: p.id })}>Add task to this project</button>
              <button className="link-btn" type="button" onClick={() => openProjectDialog(p.id)}>Edit project</button>
              <button className="link-btn btn--danger-text" type="button" onClick={() => askDeleteProject(p.id)}>Delete project</button>
            </span>
            <span className="muted muted-hint">Sorted by priority, then deadline</span>
          </div>
        </div>
      )}
    </section>
  );
}
