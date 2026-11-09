import { useState } from "react";
import { TaskRow } from "../components/TaskRow";
import { Tile } from "../components/ui";
import { fmtDay, iso, parseISO, startOfDay } from "../domain/dates";
import { plural } from "../domain/format";
import { monthDays, monthSummary, openByDay } from "../domain/planner";
import { useStore } from "../store";

const monthName = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const busyClass = (n: number) => (n === 0 ? "" : n === 1 ? " busy-1" : n === 2 ? " busy-2" : " busy-3");
const dayKind = (n: number) =>
  n === 0 ? "Free day. Nothing planned." : n === 1 ? "Quiet day: 1 open task." : n === 2 ? "Normal day: 2 open tasks." : `Busy day: ${n} open tasks.`;

/* Month view of open tasks from all projects. Helps find a quiet day for new work. */
export function PlannerPage() {
  const { tasks, projects, now, openTaskDialog } = useStore();
  const today = startOfDay(now);
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState(iso(today));
  const byDay = openByDay(tasks, projects, now);
  const days = monthDays(view.y, view.m);
  const summary = monthSummary(byDay, view.y, view.m, now);
  const dayList = byDay.get(picked) ?? [];
  const pickedDate = parseISO(picked);
  const project = (id: string) => projects.find((p) => p.id === id);

  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goToday = () => {
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setPicked(iso(today));
  };

  return (
    <main className="page">
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 className="h1">Planner</h1>
        <p className="lead">Open tasks from all projects. Click a day to see it, then add a task on a quiet day.</p>
      </header>
      <div className="planner">
        <section className="card planner-cal" aria-label={monthName(view.y, view.m)}>
          <div className="planner-bar">
            <span style={{ display: "flex", gap: 4 }}>
              <button className="btn btn--icon" type="button" aria-label="Previous month" onClick={() => move(-1)}>‹</button>
              <button className="btn btn--icon" type="button" aria-label="Next month" onClick={() => move(1)}>›</button>
            </span>
            <h2 className="planner-month">{monthName(view.y, view.m)}</h2>
            <button className="btn" type="button" onClick={goToday}>Today</button>
            <span className="busy-legend small muted planner-legend">
              <span><i className="planner-free-swatch" /> Free</span>
              <span><i className="busy-1" /> 1 task</span>
              <span><i className="busy-2" /> 2 tasks</span>
              <span><i className="busy-3" /> 3+ tasks</span>
            </span>
          </div>
          <div className="planner-week" aria-hidden="true">
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="planner-grid">
            {days.map((d) => {
              const key = iso(d);
              const list = byDay.get(key) ?? [];
              const n = list.length;
              const inMonth = d.getMonth() === view.m;
              const isToday = key === iso(today);
              const free = inMonth && n === 0 && d >= today;
              return (
                <button
                  key={key}
                  type="button"
                  className={`planner-day${busyClass(n)}${inMonth ? "" : " is-other"}${key === picked ? " is-picked" : ""}`}
                  aria-pressed={key === picked}
                  aria-label={`${fmtDay(d)}${isToday ? ", today" : ""}, ${plural(n, "open task")}`}
                  onClick={() => setPicked(key)}
                >
                  <span className="planner-day-head">
                    <span className={`planner-num${isToday ? " is-today" : ""}`}>{d.getDate()}</span>
                    {n > 0 && <span className="planner-count">{n}<span className="planner-count-word"> {n === 1 ? "task" : "tasks"}</span></span>}
                    {free && <span className="planner-free">Free</span>}
                  </span>
                  {list.slice(0, 3).map((x) => (
                    <span className="planner-chip" key={x.task.id}>
                      <Tile color={project(x.task.projectId)?.color ?? "#6B6E76"} size="sm" />
                      <span>{x.task.name}</span>
                    </span>
                  ))}
                  {n > 3 && <span className="planner-more">+{n - 3} more</span>}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="planner-side">
          <section className="card" aria-labelledby="plannerDay">
            <div className="planner-side-head">
              <h2 className="h2-day" id="plannerDay">{fmtDay(pickedDate)}{picked === iso(today) ? " (today)" : ""}</h2>
              <p className="muted" style={{ margin: 0 }}>{dayKind(dayList.length)}</p>
            </div>
            {dayList.map((x) => <TaskRow key={x.task.id} x={x} showLevel compact project={project(x.task.projectId)} />)}
            {dayList.length === 0 && <div className="planner-empty">Nothing planned. A good day for new work.</div>}
            <div style={{ padding: 16 }}>
              <button className="btn btn--primary planner-add" type="button" onClick={() => openTaskDialog({ date: picked })}>
                Add task on {fmtDay(pickedDate)}
              </button>
            </div>
          </section>
          {summary.daysLeft > 0 && (
            <section className="card card--pad planner-summary">
              <h2 className="card-title">Rest of {new Date(view.y, view.m, 1).toLocaleDateString("en-GB", { month: "long" })}</h2>
              <div><span>Open tasks</span><b>{summary.open}</b></div>
              <div><span>Free days</span><b>{summary.free} of {summary.daysLeft}</b></div>
              <div><span>Busiest day</span><b>{summary.busiest ? `${fmtDay(summary.busiest.date)} (${summary.busiest.count})` : "None"}</b></div>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
