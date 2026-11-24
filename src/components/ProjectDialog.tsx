import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deadlineLabel, plural } from "../domain/format";
import { COLORS, DEFAULT_IMPORTANCE, IMPORTANCES, IMPORTANCE_LABEL, type Importance } from "../domain/types";
import { useStore } from "../store";
import { Modal } from "./Modal";
import { CheckIcon, Tile } from "./ui";

export function ProjectDialog({ projectId }: { projectId?: string }) {
  const { projects, tasks, now, addProject, updateProject, askDeleteProject, closeDialogs } = useStore();
  const navigate = useNavigate();
  const editing = projects.find((p) => p.id === projectId);
  const used = new Set(projects.map((p) => p.color));
  const startColor = editing
    ? COLORS.find((c) => c.hex === editing.color)
    : COLORS.find((c) => !used.has(c.hex));
  const [name, setName] = useState(editing?.name ?? "");
  const [colorHex, setColorHex] = useState<string>(editing?.color ?? (startColor ?? COLORS[0]).hex);
  const [colorErr, setColorErr] = useState(false);
  const [deadline, setDeadline] = useState(editing?.deadline ?? "");
  const [importance, setImportance] = useState<Importance>(editing?.importance ?? DEFAULT_IMPORTANCE);
  const [paused, setPaused] = useState(editing?.paused ?? false);
  const [nameErr, setNameErr] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const preset = COLORS.find((c) => c.hex.toLowerCase() === colorHex.toLowerCase());
  const color = { hex: colorHex, label: preset?.label ?? `Custom (${colorHex})` };
  const taskCount = editing ? tasks.filter((t) => t.projectId === editing.id).length : 0;

  const submit = () => {
    if (!name.trim()) { setNameErr(true); nameRef.current?.focus(); return; }
    const input = { name: name.trim(), color: color.hex, deadline: deadline || null, importance };
    if (editing) {
      updateProject(editing.id, { ...input, paused });
      useStore.getState().showFlag(`Project saved: ${input.name}`);
      closeDialogs();
    } else {
      addProject(input);
      closeDialogs();
      navigate("/projects");
    }
  };

  const remove = editing && (
    <button className="btn btn--subtle btn--danger-text" type="button" onClick={() => askDeleteProject(editing.id)}>
      Delete project
    </button>
  );

  return (
    <Modal
      id="projectDialog"
      title={editing ? "Edit project" : "Create project"}
      submitLabel={editing ? "Save" : "Create"}
      onClose={closeDialogs}
      onSubmit={submit}
      footerStart={remove}
    >
      <div className="field">
        <label htmlFor="pName">Project name <span className="req">*</span></label>
        <input
          ref={nameRef} autoFocus className="input" id="pName" type="text" autoComplete="off"
          placeholder="For example: Client portal" aria-describedby="pNameErr"
          aria-invalid={nameErr || undefined} value={name}
          onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameErr(false); }}
        />
        <span className="field-error" id="pNameErr" hidden={!nameErr}>Write a project name.</span>
      </div>
      <fieldset className="field">
        <legend>Color</legend>
        <div className="swatches">
          {COLORS.map((c) => (
            <label className="swatch-opt" key={c.id}>
              <input type="radio" name="color" value={c.id} aria-label={c.label} checked={c.hex === preset?.hex} onChange={() => { setColorHex(c.hex); setColorErr(false); }} />
              <span style={{ backgroundColor: c.hex }}><CheckIcon /></span>
            </label>
          ))}
        </div>
        <div className="custom-color">
          <input
            id="pCustomColor" type="color" value={colorHex} aria-describedby="pColorErr"
            onChange={(e) => {
              if (isReddish(e.target.value)) { setColorErr(true); return; }
              setColorErr(false); setColorHex(e.target.value);
            }}
          />
          <label htmlFor="pCustomColor">Custom color</label>
        </div>
        <span className="field-error" id="pColorErr" hidden={!colorErr}>Red is not allowed. Choose another color.</span>
        <span className="field-help">Red is not offered, because red means High priority.</span>
      </fieldset>
      <fieldset className="field">
        <legend>Importance</legend>
        <div className="chips">
          {IMPORTANCES.map((n) => (
            <label className="chip-opt" key={n}>
              <input type="radio" name="pImportance" checked={importance === n} onChange={() => setImportance(n)} />
              <span>{IMPORTANCE_LABEL[n]}</span>
            </label>
          ))}
        </div>
        <span className="field-help">An important project comes back to the top of the main page faster.</span>
      </fieldset>
      <div className="field">
        <label htmlFor="pDate">Project deadline</label>
        <input
          className="input" id="pDate" type="date" aria-describedby="pDateHelp"
          value={deadline} onChange={(e) => setDeadline(e.target.value)}
        />
        <span className="field-help" id="pDateHelp">You can leave this empty. Tasks without their own date use this deadline.</span>
      </div>
      {editing && (
        <label className="check-row">
          <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} /> Pause this project (score 0, not in today's plan)
        </label>
      )}
      <div className="field">
        <span className="small muted" style={{ fontWeight: 653 }}>Preview</span>
        <div className="project-preview">
          <Tile color={color.hex} />
          <div>
            <b>{name.trim() || "New project"}</b>
            <span className="small muted">
              {IMPORTANCE_LABEL[importance]} importance. {deadline ? `Deadline ${deadlineLabel(deadline, now)}` : "No deadline"}, {plural(taskCount, "task")}. Color: {color.label}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** True for red shades. Red is reserved for High priority. */
function isReddish(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max !== r || max - min < 0.25) return false;
  const hue = (60 * (g - b)) / (max - min);
  return hue < 20 && hue > -25;
}
