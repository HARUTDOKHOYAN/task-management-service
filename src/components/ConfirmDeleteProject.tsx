import { plural } from "../domain/format";
import { useStore } from "../store";
import { Modal } from "./Modal";

export function ConfirmDeleteProject({ projectId }: { projectId: string }) {
  const { projects, tasks, archived, routines, deleteProject, closeDialogs } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  const count = tasks.filter((t) => t.projectId === projectId).length;
  const archivedCount = archived.filter((t) => t.projectId === projectId).length;
  const routineCount = routines.filter((r) => r.projectId === projectId).length;
  return (
    <Modal
      id="deleteProject"
      title="Delete project?"
      submitLabel="Delete project"
      danger
      onClose={closeDialogs}
      onSubmit={() => { deleteProject(projectId); closeDialogs(); }}
    >
      <p style={{ margin: 0 }}>
        <strong>{project.name}</strong> and its {plural(count, "task")}
        {archivedCount > 0 && ` (plus ${plural(archivedCount, "archived task")})`}
        {routineCount > 0 && `, and ${plural(routineCount, "daily job")},`} will be deleted. You cannot undo this.
      </p>
    </Modal>
  );
}
