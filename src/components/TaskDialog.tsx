import { useRef, useState } from "react";
import { infoOf } from "../domain/priority";
import { LEVEL_LABEL, type Task } from "../domain/types";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { Lozenge } from "./ui";

export function TaskDialog({ projectId, taskId }: { projectId?: string; taskId?: string }) {
  const { projects, tasks, now, addTask, updateTask, deleteTask, closeDialogs } = useStore();
  const editing = tasks.find((t) => t.id === taskId);
  const [name, setName] = useState(editing?.name ?? "");
  const [project, setProject] = useState(editing?.projectId ?? projectId ?? projects[0]?.id ?? "");
  const [date, setDate] = useState(editing?.date ?? "");
  const [time, setTime] = useState(editing?.time ?? "");
  const [pinned, setPinned] = useState(editing?.pinned ?? false);
  const [nameErr, setNameErr] = useState(false);
  const [projectErr, setProjectErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLSelectElement>(null);

  const draft: Task = {
    id: "draft", projectId: project, name, date: date || null, time: date && time ? time : null,
    pinned, done: false, doneAt: null, createdAt: "", updatedAt: "",
  };
  const x = infoOf(draft, projects, now);
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
      <div className="field-row">
        <div className="field">
          <label htmlFor="tDate">Deadline date</label>
          <input className="input" id="tDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="tTime">Time</label>
          <input className="input" id="tTime" type="time" disabled={!date} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
      <p className="field-help" style={{ margin: "-12px 0 0" }}>
        No date? The task uses the project deadline. No time? It is due at the end of the day.
      </p>
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
