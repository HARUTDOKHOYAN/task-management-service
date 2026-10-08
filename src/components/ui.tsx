import { LEVEL_LABEL, type Level } from "../domain/types";

export function Lozenge({ level, text }: { level: Level | "overdue"; text?: string }) {
  return (
    <span className={`lozenge lozenge--${level}`}>
      {text ?? (level === "overdue" ? "Overdue" : LEVEL_LABEL[level])}
    </span>
  );
}

export function Tile({ color, size }: { color: string; size?: "sm" | "md" }) {
  return <span className={`tile${size ? ` tile--${size}` : ""}`} style={{ background: color }} aria-hidden="true" />;
}

export function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#357DE8" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" />
      <path d="M8 7.25v4M8 4.75v.01" />
    </svg>
  );
}

export function CheckIcon({ size = 16, width = 2.2 }: { size?: number; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="#FFFFFF" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg className="acc-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#505258" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function NextStep({ note }: { note: string }) {
  if (!note) return null;
  return (
    <div className="message">
      <InfoIcon />
      <div>
        <strong>Next step</strong>
        {note}
      </div>
    </div>
  );
}
