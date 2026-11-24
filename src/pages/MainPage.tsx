import { BalanceBand, BalanceTrend, ScoreRules } from "../components/BalanceSummary";
import { FocusCard, PlanTask, WaitingCard, ZeroTile } from "../components/BalanceCards";
import { FreeTime } from "../components/FreeTime";
import { fmtLong } from "../domain/dates";
import { fmtMinutes, fmtScore, plural } from "../domain/format";
import { balanceTrend, planToday } from "../domain/priority";
import { useStore } from "../store";

const TREND_DAYS = 7;

export function MainPage() {
  const { projects, tasks, archived, now, openProjectDialog } = useStore();
  // Archived tasks count as past work on a project.
  const all = [...tasks, ...archived];
  const plan = planToday(all, projects, now);
  const trend = balanceTrend(all, projects, now, TREND_DAYS);
  const planIds = new Set(plan.tasks.map((x) => x.task.id));
  const projectOf = (id: string) => projects.find((p) => p.id === id);
  const first = plan.due.length > 0 ? projectOf(plan.due[0].task.projectId) : plan.focus[0]?.project;
  const headline = first ? `Start with ${first.name}` : "Everything is at zero";
  const summary = plan.tasks.length
    ? `Today's plan takes about ${fmtMinutes(plan.minutes)}. It brings the total from ${fmtScore(plan.total)} to ${fmtScore(plan.after)}.`
    : "No work is waiting. Good time to plan ahead.";

  return (
    <main className="page">
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="eyebrow-date">{fmtLong(now)}</div>
        <h1 className="h1">{headline}</h1>
        <p className="lead">{summary}</p>
      </header>
      {projects.length === 0 ? (
        <div className="card empty empty-cta">
          <span>No projects yet. Create a project, then add tasks to it.</span>
          <button className="btn btn--primary" type="button" onClick={() => openProjectDialog()}>Create project</button>
        </div>
      ) : (
        <BalanceBand plan={plan} trend={trend} />
      )}
      <div className="bal-columns">
        <div className="bal-main">
          {projects.length > 0 && tasks.length === 0 && (
            <div className="card empty">No tasks yet. Use "Create task" to add your first task.</div>
          )}
          {plan.due.length > 0 && (
            <section className="card card--pad bal-section" aria-labelledby="due-title">
              <div className="bal-section-head">
                <h2 className="card-title" id="due-title">Due now</h2>
                <span className="count-badge">{plan.due.length}</span>
                <span className="small muted bal-section-note">Overdue, due today or tomorrow, or pinned. Always first.</span>
              </div>
              <div className="due-grid">
                {plan.due.map((x) => <PlanTask key={x.task.id} x={x} project={projectOf(x.task.projectId)} />)}
              </div>
            </section>
          )}
          {plan.focus.length > 0 && (
            <section className="bal-section" aria-labelledby="today-title">
              <div className="bal-section-head">
                <h2 id="today-title">Work on today</h2>
                <span className="muted">
                  {plan.focus.length === 1 ? "The project with the highest score" : `The ${plan.focus.length} projects with the highest score`}
                </span>
              </div>
              <div className="bal-cards">
                {plan.focus.map((b) => <FocusCard key={b.project.id} b={b} planIds={planIds} />)}
              </div>
            </section>
          )}
          {plan.waiting.length > 0 && (
            <section className="bal-section" aria-labelledby="wait-title">
              <div className="bal-section-head">
                <h2 id="wait-title">Waiting</h2>
                <span className="muted">Not for today. Their score grows each day.</span>
              </div>
              <div className="bal-cards">
                {plan.waiting.map((b) => <WaitingCard key={b.project.id} b={b} top={plan.focus[0].score} />)}
              </div>
            </section>
          )}
          {plan.zero.length > 0 && (
            <section className="bal-section" aria-labelledby="zero-title">
              <div className="bal-section-head">
                <h2 id="zero-title">At zero</h2>
                <span className="muted">{plural(plan.zero.length, "project")} with nothing to do now.</span>
              </div>
              <div className="zero">
                {plan.zero.map((b) => <ZeroTile key={b.project.id} b={b} />)}
              </div>
            </section>
          )}
          <div className="free-small">
            <FreeTime variant="accordion" />
          </div>
        </div>
        <aside className="bal-side">
          {projects.length > 0 && <BalanceTrend trend={trend} />}
          <ScoreRules />
          <FreeTime variant="card" />
        </aside>
      </div>
    </main>
  );
}
