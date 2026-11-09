import { useState } from "react";
import { Modal } from "../components/Modal";
import { archiveGroups } from "../domain/archive";
import { fmtDay } from "../domain/dates";
import { plural } from "../domain/format";
import { Tile } from "../components/ui";
import { useStore } from "../store";

const day = (stamp: string | null) => (stamp ? fmtDay(new Date(stamp)) : "");

export function ArchivePage() {
  const { projects, archived, restoreTask, deleteArchived } = useStore();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const toDelete = archived.find((t) => t.id === confirmId);
  const groups = archiveGroups(archived, projects);
  return (
    <main className="page page--narrow">
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="h1">Archive</h1>
        <p className="lead">
          {archived.length
            ? `${plural(archived.length, "archived task")}. Newest first. Restore a task to put it back in its project.`
            : "Done tasks you archive show here."}
        </p>
      </header>
      {groups.length === 0 && (
        <div className="card empty">No archived tasks yet. Mark a task done, then use the archive button next to it.</div>
      )}
      {groups.map(({ project, tasks }) => (
        <section className="card" key={project.id} aria-labelledby={`arch-${project.id}`}>
          <div className="archive-head">
            <Tile color={project.color} size="md" />
            <h2 className="card-title" id={`arch-${project.id}`}>{project.name}</h2>
            <span className="small muted">{plural(tasks.length, "task")}</span>
          </div>
          {tasks.map((t) => (
            <div className="task is-done" key={t.id}>
              <span className="task-name">{t.name}</span>
              <span className="small muted archive-dates">
                Done {day(t.doneAt)} · Archived {day(t.archivedAt)}
              </span>
              <span className="archive-actions">
                <button className="btn" type="button" aria-label={`Restore task: ${t.name}`} onClick={() => restoreTask(t.id)}>
                  Restore
                </button>
                <button className="btn btn--subtle btn--danger-text" type="button" aria-label={`Delete for good: ${t.name}`} onClick={() => setConfirmId(t.id)}>
                  Delete
                </button>
              </span>
            </div>
          ))}
        </section>
      ))}
      {toDelete && (
        <Modal
          id="deleteArchived"
          title="Delete for good?"
          submitLabel="Delete"
          danger
          onClose={() => setConfirmId(null)}
          onSubmit={() => { deleteArchived(toDelete.id); setConfirmId(null); }}
        >
          <p style={{ margin: 0 }}>
            <strong>{toDelete.name}</strong> will be removed from the archive for good. You cannot undo this.
          </p>
        </Modal>
      )}
    </main>
  );
}
