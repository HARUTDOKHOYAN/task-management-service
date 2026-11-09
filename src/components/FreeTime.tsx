import { useId, useState, type FormEvent } from "react";
import { addedLabel, openFreeTasks, pickFree } from "../domain/freeTime";
import { plural } from "../domain/format";
import { useStore } from "../store";
import { ChevronIcon } from "./ui";

function CupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 6h9v3.5a3.5 3.5 0 0 1-3.5 3.5H6a3.5 3.5 0 0 1-3.5-3.5z" />
      <path d="M11.5 7h1a1.75 1.75 0 0 1 0 3.5h-1.2" />
      <path d="M5.5 2v1.5M8.5 2v1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5h2.5c3 0 4 7 7 7H14" />
      <path d="M2 11.5h2.5c1.2 0 2-1 2.6-2.2M9 6.7c.6-1.2 1.4-2.2 2.5-2.2H14" />
      <path d="M12.5 3l1.5 1.5L12.5 6M12.5 10l1.5 1.5-1.5 1.5" />
    </svg>
  );
}

/* Mini tasks with no deadline and no project. "card" sits in the right column, "accordion" is for phone. */
export function FreeTime({ variant }: { variant: "card" | "accordion" }) {
  const freeTasks = useStore((s) => s.freeTasks);
  const now = useStore((s) => s.now);
  const addFreeTask = useStore((s) => s.addFreeTask);
  const setFreeDone = useStore((s) => s.setFreeDone);
  const list = openFreeTasks(freeTasks);
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = list.find((t) => t.id === pickedId) ?? null;
  const id = useId();

  const closeForm = () => {
    setAdding(false);
    setDraft("");
    setError(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return setError(true);
    addFreeTask(name);
    closeForm();
  };
  const pick = () => setPickedId(pickFree(list, pickedId, Math.random)?.id ?? null);

  const addButton = (
    <button className="btn btn--primary" type="button" onClick={() => setAdding(true)} aria-expanded={adding} aria-controls={`${id}form`}>
      <PlusIcon />
      Add
    </button>
  );
  const pickButton = (
    <button className="btn" type="button" onClick={pick} disabled={list.length === 0}>
      <ShuffleIcon />
      {variant === "card" ? "Pick one for me" : "Pick one"}
    </button>
  );

  const body = (
    <div className="free-body">
      <p className="small muted" style={{ margin: 0 }}>
        Mini tasks with no deadline and no project. Do one when you have a few free minutes.
      </p>
      {variant === "accordion" && <div className="free-actions">{addButton}{pickButton}</div>}
      {adding && (
        <form className="free-form" id={`${id}form`} onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor={`${id}name`}>Mini task</label>
            <input
              id={`${id}name`}
              className="input"
              type="text"
              value={draft}
              placeholder="For example: Water the plants"
              autoFocus
              aria-invalid={error}
              aria-describedby={error ? `${id}err` : undefined}
              onChange={(e) => { setDraft(e.target.value); setError(false); }}
              onKeyDown={(e) => { if (e.key === "Escape") closeForm(); }}
            />
            {error && <span className="field-error" id={`${id}err`}>Enter a task name.</span>}
          </div>
          <div className="free-form-actions">
            <button className="btn btn--subtle" type="button" onClick={closeForm}>Cancel</button>
            <button className="btn btn--primary" type="submit">Add task</button>
          </div>
        </form>
      )}
      {variant === "card" && pickButton}
      <div role="status">
        {picked && (
          <div className="free-pick">
            <b>Try this one now</b>
            {picked.name}
          </div>
        )}
      </div>
      {list.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No mini tasks yet. Use "Add" to save one.</p>
      ) : (
        <ul className="free-list">
          {list.map((t) => (
            <li key={t.id}>
              <label className={`free-item${t.id === picked?.id ? " is-picked" : ""}`}>
                <input type="checkbox" checked={false} onChange={() => setFreeDone(t.id, true)} />
                <span>
                  <span>{t.name}</span>
                  <span className="small muted">{addedLabel(t.createdAt, now)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <section className="card card--pad free" aria-labelledby={`${id}title`}>
        <div className="free-head">
          <CupIcon />
          <h2 className="card-title" id={`${id}title`}>Free time</h2>
          <span className="small muted">{plural(list.length, "task")}</span>
          {addButton}
        </div>
        {body}
      </section>
    );
  }

  return (
    <section className="card free free--accordion">
      <h2 className="acc-head">
        <button className="free-toggle" type="button" aria-expanded={expanded} aria-controls={`${id}panel`} onClick={() => setExpanded(!expanded)}>
          <CupIcon />
          <b>Free time</b>
          <span className="muted">{plural(list.length, "task")}</span>
          <ChevronIcon />
        </button>
      </h2>
      {expanded && <div id={`${id}panel`} className="free-panel">{body}</div>}
    </section>
  );
}
