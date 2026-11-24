import { useNavigate } from "react-router-dom";
import { daysAgo, dueMain, fmtMinutes, fmtScore, plural } from "../domain/format";
import type { ProjectBalance, TaskInfo } from "../domain/priority";
import { IMPORTANCE_LABEL, type Project } from "../domain/types";
import { useStore } from "../store";
import { Lozenge, NextStep, PencilIcon, Tile } from "./ui";

/* A project waits "long" when its waiting factor has doubled. */
const LONG_WAIT_DAYS = 7;

function useOpenProject(projectId: string) {
  const navigate = useNavigate();
  return () => {
    const s = useStore.getState();
    if (!s.open.has(projectId)) s.toggleOpen(projectId);
    navigate("/projects");
  };
}

/** One open task as a tile: check it to finish it. With `project`, it also shows the project. */
export function PlanTask({ x, project, inPlan = false }: { x: TaskInfo; project?: Project; inPlan?: boolean }) {
  const setDone = useStore((s) => s.setDone);
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  const { task } = x;
  const high = x.level === "high";
  return (
    <div className={`ptask${high ? " ptask--due" : ""}`}>
      <label className="ptask-main">
        <input type="checkbox" checked={false} onChange={() => setDone(task.id, true)} aria-label={`Mark done: ${task.name}`} />
        <span className="ptask-name">
          {task.name}
          {project && (
            <span className="task-project small">
              <Tile color={project.color} size="sm" />
              {project.name}
            </span>
          )}
          {!high && x.due && <span className="small muted">{dueMain(x)}</span>}
        </span>
      </label>
      {inPlan && <span className="lozenge lozenge--plan">In plan</span>}
      {high && (
        <span className="ptask-due">
          {x.overdue && <Lozenge level="overdue" />}
          <b className={x.overdue ? "is-late" : ""}>{x.due ? dueMain(x) : "Pinned"}</b>
        </span>
      )}
      <span className="size-chip">{fmtMinutes(task.size)}</span>
      <button className="btn btn--subtle btn--icon task-edit" type="button" aria-label={`Edit task: ${task.name}`} onClick={() => openTaskDialog({ taskId: task.id })}>
        <PencilIcon />
      </button>
    </div>
  );
}

/** The score written out, so the number can be checked. */
function Formula({ b }: { b: ProjectBalance }) {
  const hours = Number((b.minutes / 60).toFixed(2));
  return (
    <div className="formula">
      <span aria-hidden="true">√{hours} × {b.project.importance} × {b.wait.toFixed(2)} × {b.urgency} = {fmtScore(b.score)}</span>
      <span className="visually-hidden">
        Score {fmtScore(b.score)}: square root of {hours} hours, times importance {b.project.importance}, times waiting {b.wait.toFixed(2)}, times deadline {b.urgency}.
      </span>
    </div>
  );
}

const waitedText = (days: number) => (days === 0 ? "today" : plural(days, "day"));

/** Big card for a project to work on today. */
export function FocusCard({ b, planIds }: { b: ProjectBalance; planIds: Set<string> }) {
  const { project: p } = b;
  const openProject = useOpenProject(p.id);
  const dueNow = b.open.filter((x) => x.level === "high").length;
  const rest = b.open.filter((x) => x.level !== "high");
  const next = rest.slice(0, 3);
  return (
    <article className="card pcard" aria-labelledby={`pc-${p.id}`}>
      <div className="pcard-head">
        <Tile color={p.color} />
        <div className="pcard-title">
          <h3 id={`pc-${p.id}`}>{p.name}</h3>
          <div className="pcard-tags">
            <span className="lozenge lozenge--low">{IMPORTANCE_LABEL[p.importance]} importance</span>
            {dueNow > 0 && <span className="lozenge lozenge--high">{dueNow} due now</span>}
          </div>
        </div>
        <div className="pcard-score">
          <b>{fmtScore(b.score)}</b>
          <span className="small muted">score</span>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><b>{fmtMinutes(b.minutes)}</b><span className="small muted">left</span></div>
        <div className="stat"><b>{waitedText(b.days)}</b><span className="small muted">{b.days === 0 ? "last work" : "since last work"}</span></div>
        <div className="stat"><b>× {b.urgency}</b><span className="small muted">{b.soon ? "due this week" : "no close deadline"}</span></div>
      </div>
      <Formula b={b} />
      <NextStep note={p.note} />
      {next.length > 0 && (
        <div className="ptasks">
          <div className="ptasks-title">Next tasks</div>
          {next.map((x) => <PlanTask key={x.task.id} x={x} inPlan={planIds.has(x.task.id)} />)}
        </div>
      )}
      <div className="pcard-foot">
        <button className="link-btn" type="button" onClick={openProject}>Open project</button>
        {rest.length > next.length && <span className="muted">{plural(rest.length - next.length, "more task")}</span>}
      </div>
    </article>
  );
}

/** Small card for a project that is not for today. */
export function WaitingCard({ b, top }: { b: ProjectBalance; top: number }) {
  const { project: p } = b;
  const openProject = useOpenProject(p.id);
  const pct = Math.round((b.score / top) * 100);
  const next = b.open[0];
  return (
    <article className="card pcard pcard--small" aria-labelledby={`pc-${p.id}`}>
      <div className="pcard-head">
        <Tile color={p.color} size="md" />
        <div className="pcard-title"><h3 id={`pc-${p.id}`}>{p.name}</h3></div>
        <div className="pcard-score"><b>{fmtScore(b.score)}</b></div>
      </div>
      <div className="progress" role="img" aria-label={`Score ${fmtScore(b.score)}, ${pct}% of the highest score`}>
        <span style={{ width: `${pct}%`, background: p.color }} />
      </div>
      <div className="pcard-tags">
        <span className="lozenge lozenge--low">{IMPORTANCE_LABEL[p.importance]} importance</span>
        {b.days >= LONG_WAIT_DAYS && <span className="lozenge lozenge--medium">Waiting {b.days} days</span>}
      </div>
      <div className="pcard-facts">{fmtMinutes(b.minutes)} left, last work {daysAgo(b.days)}</div>
      {next && (
        <div className="ptasks">
          <div className="ptasks-title">Next task</div>
          <PlanTask x={next} />
        </div>
      )}
      <Formula b={b} />
      <div className="pcard-foot">
        <button className="link-btn" type="button" onClick={openProject}>Open project</button>
      </div>
    </article>
  );
}

/** A project with score 0: no open tasks, or paused. */
export function ZeroTile({ b }: { b: ProjectBalance }) {
  const { project: p } = b;
  const updateProject = useStore((s) => s.updateProject);
  const showFlag = useStore((s) => s.showFlag);
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  const resume = () => {
    updateProject(p.id, { paused: false });
    showFlag(`Project resumed: ${p.name}`, () => updateProject(p.id, { paused: true }));
  };
  return (
    <div className="quiet">
      <Tile color={p.color} size="md" />
      {p.paused ? (
        <>
          <span><strong>{p.name}</strong> is paused. {b.minutes > 0 ? `${fmtMinutes(b.minutes)} left.` : "No open tasks."}</span>
          <button className="btn" type="button" onClick={resume}>Resume<span className="visually-hidden"> {p.name}</span></button>
        </>
      ) : (
        <>
          <span><strong>{p.name}</strong> has no open tasks.</span>
          <button className="link-btn" type="button" onClick={() => openTaskDialog({ projectId: p.id })}>Add task<span className="visually-hidden"> to {p.name}</span></button>
        </>
      )}
    </div>
  );
}
