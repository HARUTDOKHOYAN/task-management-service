import { ProjectAccordion } from "../components/ProjectAccordion";
import { plural } from "../domain/format";
import { useStore } from "../store";

export function ProjectsPage() {
  const { projects, tasks, now, open, setAllOpen, openProjectDialog } = useStore();
  return (
    <main className="page page--narrow">
      <header className="page-head">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 className="h1">Projects</h1>
          <p className="lead">{plural(projects.length, "project")}.{projects.length > 0 && " Click a project to see all its tasks."}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => setAllOpen(true)}>Expand all</button>
          <button className="btn" type="button" onClick={() => setAllOpen(false)}>Collapse all</button>
          <button className="btn" type="button" onClick={() => openProjectDialog()}>Create project</button>
        </div>
      </header>
      {projects.length === 0 && (
        <div className="card empty empty-cta">
          <span>No projects yet. Create your first project to start.</span>
          <button className="btn btn--primary" type="button" onClick={() => openProjectDialog()}>Create project</button>
        </div>
      )}
      <div className="accordion">
        {projects.map((p) => (
          <ProjectAccordion key={p.id} project={p} tasks={tasks} projects={projects} now={now} isOpen={open.has(p.id)} />
        ))}
      </div>
    </main>
  );
}
