import { useRef, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { fmtDay, iso, parseISO } from "../domain/dates";
import { plural } from "../domain/format";
import { allLoad, infoOf, projectLoad } from "../domain/priority";
import { LEVEL_LABEL, type Task } from "../domain/types";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { Lozenge } from "./ui";

/* Which load the calendar shows. Remembered in this browser only. */
const LOAD_KEY = "focus-list:calendar-load";
type LoadMode = "all" | "project";
function readLoadMode(): LoadMode {
  try {
    return localStorage.getItem(LOAD_KEY) === "project" ? "project" : "all";
  } catch {
    return "all";
  }
}

export function TaskDialog({ projectId, taskId, date: startDate }: { projectId?: string; taskId?: string; date?: string }) {
  const { projects, tasks, now, addTask, updateTask, deleteTask, closeDialogs } = useStore();
  const editing = tasks.find((t) => t.id === taskId);
  const [name, setName] = useState(editing?.name ?? "");
  const [project, setProject] = useState(editing?.projectId ?? projectId ?? projects[0]?.id ?? "");
  const [date, setDate] = useState(editing?.date ?? startDate ?? "");
  const [loadMode, setLoadMode] = useState<LoadMode>(readLoadMode);
  const [time, setTime] = useState(editing?.time ?? "");
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
  const [nameErr, setNameErr] = useState(false);
  const [projectErr, setProjectErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);

  const draft: Task = {
    id: "draft", projectId: project, name, date: date || null, time: date && time ? time : null,
    pinned, done: false, doneAt: null, archivedAt: null, createdAt: "", updatedAt: "",
  };
  const x = infoOf(draft, projects, now);
  const others = tasks.filter((t) => t.id !== editing?.id);
  const showAll = loadMode === "all" || !project;
  const busy = new Map(
    (showAll ? allLoad(others, projects, now, 400) : projectLoad(others, projects, project, now, 400))
      .map((d) => [iso(d.date), d.high + d.medium + d.low]),
  );
  const chooseLoad = (mode: LoadMode) => {
    setLoadMode(mode);
    try { localStorage.setItem(LOAD_KEY, mode); } catch { /* storage blocked: not important */ }
  };
  const onDay = date ? busy.get(date) ?? 0 : 0;
  const why = pinned ? "It is pinned." : !x.due ? "It has no deadline."
    : x.due.days < 0 ? "The deadline has passed." : x.due.days === 0 ? "The deadline is today."
    : x.due.days === 1 ? "The deadline is tomorrow."
    : `The deadline is in ${x.due.days} days${x.due.fromProject ? " (project deadline)." : "."}`;

  const submit = () => {
    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return; }
    if (!project) { setProjectErr(true); projectRef.current?.focus(); return; }
    const input = { projectId: project, name: name.trim(), date: draft.date, time: draft.time, pinned };
    if (editing) updateTask(editing.id, input);
    else addTask(input);
    closeDialogs();
  };

  const remove = editing && (
    <button className="btn btn--subtle btn--danger-text" type="button" onClick={() => { deleteTask(editing.id); closeDialogs(); }}>
      Delete task
    </button>
  );

  return (
    <Modal
      id="taskDialog"
      title={editing ? "Edit task" : "Create task"}
      submitLabel={editing ? "Save" : "Create"}
      onClose={closeDialogs}
      onSubmit={submit}
      footerStart={remove}
    >
      <p className="muted" style={{ margin: 0 }}>Fields marked with <span className="req">*</span> are required.</p>
      <div className="field">
        <label htmlFor="tName">Task name <span className="req">*</span></label>
        <input
          ref={nameRef} autoFocus className="input" id="tName" type="text" autoComplete="off"
          placeholder="For example: Send homepage draft to client" aria-describedby="tNameErr"
          aria-invalid={nameErr || undefined} value={name}
          onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameErr(false); }}
        />
        <span className="field-error" id="tNameErr" hidden={!nameErr}>Write a task name.</span>
      </div>
      <div className="field">
        <label htmlFor="tProject">Project <span className="req">*</span></label>
        <select
          ref={projectRef} className="input" id="tProject" value={project} aria-describedby="tProjectErr"
          aria-invalid={projectErr || undefined}
          onChange={(e) => { setProject(e.target.value); setProjectErr(false); }}
        >
          <option value="">Choose a project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="field-error" id="tProjectErr" hidden={!projectErr}>Choose a project.</span>
      </div>
      <div className="field">
        <div className="date-head">
          <span className="label" id="tDateLabel">Deadline date{date && <>: <b>{fmtDay(parseISO(date))}</b></>}</span>
          <fieldset className="seg">
            <legend className="seg-legend">Show load for</legend>
            <div className="seg-opts">
              <label className="seg-opt">
                <input type="radio" name="tLoad" checked={showAll} onChange={() => chooseLoad("all")} />
                <span>All projects</span>
              </label>
              <label className="seg-opt">
                <input type="radio" name="tLoad" checked={!showAll} disabled={!project} onChange={() => chooseLoad("project")} />
                <span>This project</span>
              </label>
            </div>
          </fieldset>
        </div>
        <Calendar
          className="busy-cal"
          locale="en-GB"
          aria-labelledby="tDateLabel"
          minDetail="year"
          value={date ? parseISO(date) : null}
          onChange={(v) => { if (v instanceof Date) setDate(iso(v)); }}
          tileClassName={({ date: d, view }) => {
            if (view !== "month") return null;
            const n = busy.get(iso(d)) ?? 0;
            return n === 0 ? null : n === 1 ? "busy-1" : n === 2 ? "busy-2" : "busy-3";
          }}
          tileContent={({ date: d, view }) => {
            const n = view === "month" ? busy.get(iso(d)) ?? 0 : 0;
            return n ? <span className="busy-count" aria-label={`${n} open ${n === 1 ? "task" : "tasks"}`}>{n}</span> : null;
          }}
        />
        <div className="busy-legend small muted">
          <span><i className="busy-1" /> 1 task</span>
          <span><i className="busy-2" /> 2 tasks</span>
          <span><i className="busy-3" /> 3+ tasks</span>
          {date && <button type="button" className="btn btn--subtle" onClick={() => { setDate(""); setTime(""); }}>Clear date</button>}
        </div>
        <span className="field-help">
          {showAll ? "Numbers show open tasks from all your projects." : "Numbers show open tasks in this project only."}{" "}
          {date ? `${fmtDay(parseISO(date))} has ${onDay ? `${plural(onDay, "task")} already` : "no tasks yet"}.` :"Darker days are busier. Pick a quiet day."}
        </span>
      </div>
      <div className="field">
        <label htmlFor="tTime">Time</label>
        <input className="input" id="tTime" type="time" disabled={!date} value={time} onChange={(e) => setTime(e.target.value)} />
        <span className="field-help">No date? The task uses the project deadline. No time? It is due at the end of the day.</span>
      </div>
      {project ? (
        <div className={`preview-priority is-${x.level}`} role="status">
          <Lozenge level={x.level} />
          <span>This task will be <strong>{LEVEL_LABEL[x.level]}</strong>. {why}</span>
        </div>
      ) : (
        <div className="preview-priority is-low" role="status">Choose a project to see the priority.</div>
      )}
      <label className="check-row">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to High (stays High even if the deadline is far)
      </label>
    </Modal>
  );
}
