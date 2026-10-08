import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Flag } from "./components/Flag";
import { ConfirmDeleteProject } from "./components/ConfirmDeleteProject";
import { ProjectDialog } from "./components/ProjectDialog";
import { TaskDialog } from "./components/TaskDialog";
import { TopNav } from "./components/TopNav";
import { MainPage } from "./pages/MainPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { useStore } from "./store";

export function App() {
  const { status, load, tick, taskDialog, projectDialog, confirmDeleteProject, openTaskDialog } = useStore();
  const { pathname } = useLocation();

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const id = setInterval(tick, 60_000); // priority follows the clock
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [tick]);

  return (
    <>
      <TopNav />
      <div aria-live="polite">
        {status === "loading" && <main className="page"><p className="muted">Loading your tasks…</p></main>}
        {status === "error" && (
          <main className="page">
            <div className="card empty">
              Could not load your data. Is the server running?{" "}
              <button className="link-btn" type="button" onClick={() => void load()}>Try again</button>
            </div>
          </main>
        )}
        {status === "ready" && (
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="*" element={<MainPage />} />
          </Routes>
        )}
      </div>
      <button className="btn btn--primary fab-create" type="button" onClick={() => openTaskDialog()}>
        Create task
      </button>
      {taskDialog && <TaskDialog projectId={taskDialog.projectId} taskId={taskDialog.taskId} />}
      {projectDialog && !confirmDeleteProject && <ProjectDialog projectId={projectDialog.projectId} />}
      {confirmDeleteProject && <ConfirmDeleteProject projectId={confirmDeleteProject} />}
      <Flag />
    </>
  );
}
