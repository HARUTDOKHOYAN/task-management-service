import { dueMain, dueSub, fmtMinutes } from "../domain/format";
import type { TaskInfo } from "../domain/priority";
import type { Project } from "../domain/types";
import { useStore } from "../store";
import { canArchive } from "../domain/archive";
import { ArchiveIcon, Lozenge, PencilIcon, Tile } from "./ui";

/* With `project`, the row also shows which project the task belongs to. `compact` fits narrow side panels. */
export function TaskRow({ x, showLevel = false, project, compact = false }: { x: TaskInfo; showLevel?: boolean; project?: Project; compact?: boolean }) {
  const setDone = useStore((s) => s.setDone);
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  const archiveTasks = useStore((s) => s.archiveTasks);
  const { task, overdue } = x;
  return (
    <div className={`task${task.done ? " is-done" : ""}${compact ? " task--compact" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => setDone(task.id, e.target.checked)}
        aria-label={`${task.done ? "Mark not done" : "Mark done"}: ${task.name}`}
      />
      <span className="task-name">
        {task.name}
        {task.pinned && !task.done && <> <span className="small muted">(pinned)</span></>}
        {project && (
          <span className="task-project small muted">
            <Tile color={project.color} size="sm" />
            {project.name}
          </span>
        )}
      </span>
      <span className="task-meta">
        {overdue && <Lozenge level="overdue" />}
        {showLevel && <Lozenge level={x.level} />}
        {!task.done && <span className="size-chip size-chip--row">{fmtMinutes(task.size)}</span>}
        <span className="task-due">
          <b className={overdue ? "is-late" : ""}>{task.done ? "Done" : dueMain(x)}</b>
          <span>{dueSub(x)}</span>
        </span>
      </span>
      {canArchive(task) && (
        <button
          className="btn btn--subtle btn--icon task-edit"
          type="button"
          aria-label={`Archive task: ${task.name}`}
          title="Archive"
          onClick={() => archiveTasks([task.id])}
        >
          <ArchiveIcon />
        </button>
      )}
      <button
        className="btn btn--subtle btn--icon task-edit"
        type="button"
        aria-label={`Edit task: ${task.name}`}
        onClick={() => openTaskDialog({ taskId: task.id })}
      >
        <PencilIcon />
      </button>
    </div>
  );
}
