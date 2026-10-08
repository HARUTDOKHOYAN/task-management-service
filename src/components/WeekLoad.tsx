import { dayLetter, fmtDay } from "../domain/dates";
import type { LoadDay } from "../domain/priority";
import { LEVEL_LABEL, type OpenLevel } from "../domain/types";

const KEYS: OpenLevel[] = ["high", "medium", "low"];

export function WeekLoad({ days }: { days: LoadDay[] }) {
  const totals = { high: 0, medium: 0, low: 0 };
  for (const d of days) for (const k of KEYS) totals[k] += d[k];
  const total = totals.high + totals.medium + totals.low;
  const max = Math.max(1, ...days.map((d) => d.high + d.medium + d.low));
  const unit = Math.min(24, 168 / max);
  const desc = days
    .map((d, i) => `${i === 0 ? "Today" : fmtDay(d.date)}: ${d.high} High, ${d.medium} Medium, ${d.low} Low`)
    .join(". ");
  return (
    <section className="card card--pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 className="card-title">This week's load</h2>
        <p className="small muted" style={{ margin: "4px 0 0" }}>Open tasks due in the next 7 days, starting today</p>
      </div>
      <div
        className="load-bar"
        role="img"
        aria-label={`${total} open tasks: ${totals.high} High, ${totals.medium} Medium, ${totals.low} Low`}
      >
        {KEYS.map((k) =>
          totals[k] ? <span key={k} className={`c-${k}`} style={{ width: `${((totals[k] / total) * 100).toFixed(1)}%` }} /> : null,
        )}
      </div>
      <div className="legend">
        {KEYS.map((k) => (
          <div className="legend-row" key={k}>
            <span className={`swatch c-${k}`} />
            <span>{LEVEL_LABEL[k]}</span>
            <b>{totals[k]}</b>
          </div>
        ))}
      </div>
      <div className="load-cols" role="img" aria-label={`Open tasks per day. ${desc}`}>
        {days.map((d, i) => (
          <div className="load-col" key={i}>
            <div className="load-track">
              {KEYS.map((k) => (d[k] ? <span key={k} className={`c-${k}`} style={{ height: `${(d[k] * unit).toFixed(1)}px` }} /> : null))}
            </div>
            <div className={`load-label${i === 0 ? " is-today" : ""}`}>
              {dayLetter(d.date)}
              <br />
              {d.date.getDate()}
            </div>
          </div>
        ))}
      </div>
      <p className="small muted" style={{ margin: "-8px 0 0" }}>
        <span style={{ color: "#1868DB", fontWeight: 653 }}>Blue</span> = today. Overdue tasks count on today.
      </p>
    </section>
  );
}
