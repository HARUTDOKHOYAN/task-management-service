import { useState } from "react";
import type { Project } from "../domain/types";
import { useStore } from "../store";
import { NextStep } from "./ui";

/* "Next step" note on a project, edited in place. */
export function NoteEditor({ project }: { project: Project }) {
  const updateProject = useStore((s) => s.updateProject);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(project.note);
  const id = `note-${project.id}`;

  if (!editing) {
    return (
      <div className="note">
        <NextStep note={project.note} />
        <div className="note-actions">
          <button className="link-btn" type="button" onClick={() => { setText(project.note); setEditing(true); }}>
            {project.note ? "Edit next step" : "Add next step"}
          </button>
        </div>
      </div>
    );
  }
  const save = () => {
    updateProject(project.id, { note: text.trim() });
    setEditing(false);
  };
  return (
    <div className="note field">
      <label htmlFor={id}>Next step</label>
      <textarea
        id={id} className="input textarea" autoFocus value={text}
        placeholder="For example: Call the client about the logo"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
      />
      <div className="note-actions">
        <button className="btn btn--primary" type="button" onClick={save}>Save</button>
        <button className="btn btn--subtle" type="button" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </div>
  );
}
