import { dayLetter } from "../domain/dates";
import { fmtMinutes, fmtScore, plural } from "../domain/format";
import type { Plan } from "../domain/priority";

type TrendDay = { date: Date; total: number };

/** How the total changed since the first day of the trend. */
function change(trend: TrendDay[], total: number) {
  const diff = total - trend[0].total;
  if (Math.abs(diff) < 0.05) return { text: "No change this week", tone: "low" };
  return diff < 0
    ? { text: `Down ${fmtScore(-diff)} this week`, tone: "done" }
    : { text: `Up ${fmtScore(diff)} this week`, tone: "medium" };
}

/** Top band: the total, where the weight is, and the total after today's plan. */
export function BalanceBand({ plan, trend }: { plan: Plan; trend: TrendDay[] }) {
  const active = [...plan.focus, ...plan.waiting];
  const minutes = active.reduce((sum, r) => sum + r.minutes, 0);
  const delta = change(trend, plan.total);
  return (
    <section className="card bal-band" aria-labelledby="bal-title">
      <div className="bal-total">
        <h2 className="bal-label" id="bal-title">Total balance</h2>
        <div className="bal-number">
          <b>{fmtScore(plan.total)}</b>
          <span className="muted">goal is 0</span>
        </div>
        <span className={`lozenge lozenge--${delta.tone}`}>{delta.text}</span>
      </div>
      {active.length > 0 && (
        <div className="bal-share">
          <div className="bal-share-head small muted">
            <span>Where the weight is</span>
            <span>{fmtMinutes(minutes)} of work left in {plural(active.length, "project")}</span>
          </div>
          <div
            className="share-bar"
            role="img"
            aria-label={`Share of the total: ${active.map((r) => `${r.project.name} ${fmtScore(r.score)}`).join(", ")}`}
          >
            {active.map((r) => (
              <span key={r.project.id} style={{ width: `${(r.score / plan.total) * 100}%`, background: r.project.color }} />
            ))}
          </div>
          <div className="share-legend">
            {active.map((r) => (
              <span key={r.project.id}>
                <i style={{ background: r.project.color }} />
                {r.project.name} <b>{fmtScore(r.score)}</b>
              </span>
            ))}
          </div>
        </div>
      )}
      {plan.tasks.length > 0 && (
        <div className="bal-after">
          <span className="bal-label">After today's plan</span>
          <b>{fmtScore(plan.after)}</b>
          <span className="small">{plural(plan.tasks.length, "task")}, {fmtMinutes(plan.minutes)}</span>
        </div>
      )}
    </section>
  );
}

/** Right column: the total for each of the last 7 days. */
export function BalanceTrend({ trend }: { trend: TrendDay[] }) {
  const max = Math.max(...trend.map((d) => d.total), 1);
  const first = trend[0].total;
  const last = trend[trend.length - 1].total;
  const story =
    Math.abs(last - first) < 0.05 ? "No change." : last < first ? "You finish work faster than it grows." : "Work grows faster than you finish it.";
  return (
    <section className="card card--pad" aria-labelledby="trend-title">
      <h2 className="card-title" id="trend-title">Last 7 days</h2>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>Total balance at the end of each day. The last bar is now.</p>
      <div
        className="load-cols"
        role="img"
        aria-label={`Total balance per day. ${trend.map((d) => `${d.date.getDate()}: ${fmtScore(d.total)}`).join(". ")}.`}
      >
        {trend.map((d, i) => {
          const today = i === trend.length - 1;
          return (
            <div className="load-col" key={d.date.getTime()}>
              <div className="load-track load-track--short">
                <span className={today ? "c-today" : "c-past"} style={{ height: `${(d.total / max) * 100}%` }} />
              </div>
              <div className={`load-label${today ? " is-today" : ""}`}>{dayLetter(d.date)}<br />{d.date.getDate()}</div>
            </div>
          );
        })}
      </div>
      <p className="small muted" style={{ margin: "12px 0 0" }}>From {fmtScore(first)} to {fmtScore(last)}. {story}</p>
    </section>
  );
}

/** Right column: the formula in plain words. */
export function ScoreRules() {
  return (
    <section className="card card--pad" aria-labelledby="rules-title">
      <h2 className="card-title" id="rules-title">How the score works</h2>
      <div className="formula formula--box">score = √hours × importance × waiting × deadline</div>
      <div className="rules">
        <div><b>Hours</b><span className="small">The sizes of all open tasks, added up.</span></div>
        <div><b>Importance</b><span className="small">High = 3, Normal = 2, Low = 1.</span></div>
        <div><b>Waiting</b><span className="small">1 + days since last work ÷ 7. It grows every day.</span></div>
        <div><b>Deadline</b><span className="small">1.5 when a task is due this week. If not, 1.</span></div>
      </div>
      <p className="small muted" style={{ margin: 0 }}>The highest score goes first. A project with no open tasks has score 0. High tasks are always in "Due now".</p>
    </section>
  );
}
