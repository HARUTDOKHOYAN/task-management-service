import { Lozenge } from "./ui";

export function PriorityRules() {
  return (
    <section className="card card--pad">
      <h2 className="card-title" style={{ marginBottom: 12 }}>How priority works</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="rule-row"><Lozenge level="high" /><span>overdue, today, tomorrow</span></div>
        <div className="rule-row"><Lozenge level="medium" /><span>2-3 days left</span></div>
        <div className="rule-row"><Lozenge level="low" /><span>4+ days left</span></div>
      </div>
      <p className="small muted" style={{ margin: "12px 0 0" }}>No time set means end of day. Pinned tasks stay High.</p>
    </section>
  );
}
