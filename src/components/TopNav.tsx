import { NavLink } from "react-router-dom";
import { useStore } from "../store";
import { CheckIcon } from "./ui";

export function TopNav() {
  const openTaskDialog = useStore((s) => s.openTaskDialog);
  return (
    <nav className="nav" aria-label="Main">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <CheckIcon size={14} width={2} />
        </span>
        Focus list
      </div>
      <div className="nav-links">
        <NavLink className="nav-link" to="/" end>Main page</NavLink>
        <NavLink className="nav-link" to="/projects">Projects</NavLink>
      </div>
      <button className="btn btn--primary" type="button" onClick={() => openTaskDialog()}>
        Create task
      </button>
    </nav>
  );
}
