import { useRef, useState, type FormEvent } from "react";
import { dailyGroups } from "../domain/daily";
import { fmtLong } from "../domain/dates";
import { InfoIcon, Tile, TrashIcon } from "../components/ui";
import { useStore } from "../store";

/* Start page: jobs to do for each project every day. Checks reset at midnight. */
export function DailyPage() {
  const { projects, routines, now, addRoutine, toggleRoutine, deleteRoutine, openProjectDialog } = useStore();
  const { groups, done, total } = dailyGroups(routines, projects, now);
  const [project, setProject] = useState("");
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState(false);
  const [projectErr, setProjectErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);
  const pct = total ? Math.round((done / total) * 100) : 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!project) { setProjectErr(true); projectRef.current?.focus(); return; }
    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return; }
    addRoutine(project, name.trim());
    setName("");
    nameRef.current?.focus();
  };

  return (
    <main className="page page--narrow">
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="eyebrow-date">{fmtLong(now)}</div>
        <h1 className="h1">Daily checklist</h1>
        <p className="lead">
          {total
            ? `${done} of ${total} done today. Checks reset at midnight.`
            : "Jobs you do for a project every day, for example \"Check Bugsnag\"."}
        </p>
        {total > 0 && (
          <span className="progress daily-progress" role="img" aria-label={`${pct}% done today`}>
            <span style={{ width: `${pct}%` }} />
          </span>
        )}
      </header>

      {total > 0 && done === total && (
        <div className="message">
          <InfoIcon />
          <div><strong>All done for today</strong>Good work. The list starts again tomorrow.</div>
        </div>
      )}

      {groups.map(({ project: p, items, done: groupDone }) => (
        <section className="card" key={p.id} aria-labelledby={`daily-${p.id}`}>
          <div className="archive-head">
            <Tile color={p.color} size="md" />
            <h2 className="card-title" id={`daily-${p.id}`}>{p.name}</h2>
            <span className="small muted">{groupDone} of {items.length} done</span>
          </div>
          {items.map(({ routine: r, done: isDone }) => (
            <div className={`task${isDone ? " is-done" : ""}`} key={r.id}>
              <input type="checkbox" id={`job-${r.id}`} checked={isDone} onChange={() => toggleRoutine(r.id)} />
              <label className="task-name" htmlFor={`job-${r.id}`}>{r.name}</label>
              <button
                className="btn btn--subtle btn--icon task-edit"
                type="button"
                aria-label={`Delete daily job: ${r.name}`}
                title="Delete"
                onClick={() => deleteRoutine(r.id)}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </section>
      ))}

      {projects.length === 0 ? (
        <div className="card empty empty-cta">
          <span>Daily jobs belong to a project. Create a project first.</span>
          <button className="btn btn--primary" type="button" onClick={() => openProjectDialog()}>Create project</button>
        </div>
      ) : (
        <form className="card card--pad daily-add" onSubmit={submit} noValidate aria-labelledby="dailyAddTitle">
          <h2 className="card-title" id="dailyAddTitle">Add a daily job</h2>
          <div className="daily-add-row">
            <div className="field">
              <label htmlFor="dProject">Project <span className="req">*</span></label>
              <select
                ref={projectRef} className="input" id="dProject" value={project}
                aria-invalid={projectErr || undefined} aria-describedby="dProjectErr"
                onChange={(e) => { setProject(e.target.value); setProjectErr(false); }}
              >
                <option value="">Choose a project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="field-error" id="dProjectErr" hidden={!projectErr}>Choose a project.</span>
            </div>
            <div className="field">
              <label htmlFor="dName">Daily job <span className="req">*</span></label>
              <input
                ref={nameRef} className="input" id="dName" type="text" value={name}
                placeholder="For example: Check Bugsnag for new bugs"
                aria-invalid={nameErr || undefined} aria-describedby="dNameErr"
                onChange={(e) => { setName(e.target.value); setNameErr(false); }}
              />
              <span className="field-error" id="dNameErr" hidden={!nameErr}>Enter a job name.</span>
            </div>
            <button className="btn btn--primary" type="submit">Add</button>
          </div>
        </form>
      )}
    </main>
  );
}
