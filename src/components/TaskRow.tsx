import { dueMain, dueSub } from "../domain/format";
import type { TaskInfo } from "../domain/priority";
import { useStore } from "../store";
import { Lozenge, PencilIcon } from "./ui";

export function TaskRow({ x, showLevel = false }: { x: TaskInfo; showLevel?: boolean }) {
  const setDone = useStore((s) => s.setDone);
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  const { task, overdue } = x;
  return (
    <div className={`task${task.done ? " is-done" : ""}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={(e) => setDone(task.id, e.target.checked)}
        aria-label={`${task.done ? "Mark not done" : "Mark done"}: ${task.name}`}
      />
      <span className="task-name">
        {task.name}
        {task.pinned && !task.done && <> <span className="small muted">(pinned)</span></>}
      </span>
      <span className="task-meta">
        {overdue && <Lozenge level="overdue" />}
        {showLevel && <Lozenge level={x.level} />}
        <span className="task-due">
          <b className={overdue ? "is-late" : ""}>{task.done ? "Done" : dueMain(x)}</b>
          <span>{dueSub(x)}</span>
        </span>
      </span>
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
