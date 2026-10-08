import { plural } from "../domain/format";
import { useStore } from "../store";
import { Modal } from "./Modal";

export function ConfirmDeleteProject({ projectId }: { projectId: string }) {
  const { projects, tasks, deleteProject, closeDialogs } = useStore();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  const count = tasks.filter((t) => t.projectId === projectId).length;
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
        <strong>{project.name}</strong> and its {plural(count, "task")} will be deleted. You cannot undo this.
      </p>
    </Modal>
  );
}
