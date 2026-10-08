import { ComingNext } from "../components/ComingNext";
import { PriorityRules } from "../components/PriorityRules";
import { ProjectGroup } from "../components/ProjectGroup";
import { Tile } from "../components/ui";
import { WeekLoad } from "../components/WeekLoad";
import { fmtDay, fmtLong, parseISO } from "../domain/dates";
import { plural } from "../domain/format";
import { groupForMain, infoOf, weekLoad } from "../domain/priority";
import { useStore } from "../store";

export function MainPage() {
  const { projects, tasks, now, openProjectDialog } = useStore();
  const open = tasks.map((t) => infoOf(t, projects, now)).filter((x) => x.level !== "done");
  const { active, quiet } = groupForMain(tasks, projects, now);
  const highCount = active.reduce((s, g) => s + g.high.length, 0);
  const overdue = open.filter((x) => x.overdue).length;
  const headline = active.length ? `Start with ${active[0].project.name}` : "Nothing urgent right now";
  const summary = [
    overdue ? `${plural(overdue, "task")} overdue.` : "",
    highCount ? `${plural(highCount, "High task")} across ${plural(active.length, "project")}.` : "No High tasks.",
  ].filter(Boolean).join(" ");

  return (
    <main className="page">
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="eyebrow-date">{fmtLong(now)}</div>
        <h1 className="h1">{headline}</h1>
        <p className="lead">{summary}</p>
      </header>
      <div className="columns">
        <aside className="col col-left" aria-label="This week's load">
          <WeekLoad days={weekLoad(tasks, projects, now)} />
        </aside>
        <div className="col col-main">
          {projects.length === 0 && (
            <div className="card empty empty-cta">
              <span>No projects yet. Create a project, then add tasks to it.</span>
              <button className="btn btn--primary" type="button" onClick={() => openProjectDialog()}>Create project</button>
            </div>
          )}
          {projects.length > 0 && tasks.length === 0 && (
            <div className="card empty">No tasks yet. Use "Create task" to add your first task.</div>
          )}
          {tasks.length > 0 && active.length === 0 && (
            <div className="card empty">No High tasks. Good time to plan ahead.</div>
          )}
          {active.map((g) => <ProjectGroup key={g.project.id} group={g} />)}
          {quiet.map((p) => (
            <div className="quiet" key={p.id}>
              <Tile color={p.color} size="md" />
              <span><strong>{p.name}</strong> has nothing urgent. Deadline {fmtDay(parseISO(p.deadline))}.</span>
            </div>
          ))}
        </div>
        <aside className="col col-right">
          <PriorityRules />
          <ComingNext open={open} projects={projects} />
        </aside>
      </div>
    </main>
  );
}
