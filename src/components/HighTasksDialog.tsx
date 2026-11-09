import { plural } from "../domain/format";
import type { TaskInfo } from "../domain/priority";
import type { Project } from "../domain/types";
import { Modal } from "./Modal";
import { TaskRow } from "./TaskRow";

/* All open High tasks from every project in one list. */
export function HighTasksDialog({ list, projects, onClose }: { list: TaskInfo[]; projects: Project[]; onClose: () => void }) {
  const projectCount = new Set(list.map((x) => x.task.projectId)).size;
  return (
    <Modal id="highTasks" title="All High tasks" onClose={onClose}>
      <p className="lead" style={{ margin: 0 }}>
        {list.length === 0
          ? "No High tasks right now."
          : `${plural(list.length, "task")} from ${plural(projectCount, "project")}. The earliest deadline is first.`}
      </p>
      {list.length > 0 && (
        <div className="high-list">
          {list.map((x) => (
            <TaskRow key={x.task.id} x={x} project={projects.find((p) => p.id === x.task.projectId)} />
          ))}
        </div>
      )}
    </Modal>
  );
}
