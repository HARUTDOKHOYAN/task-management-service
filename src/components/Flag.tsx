import { useEffect } from "react";
import { useStore } from "../store";

export function Flag() {
  const flag = useStore((s) => s.flag);
  const hideFlag = useStore((s) => s.hideFlag);
  useEffect(() => {
    if (!flag) return;
    const t = setTimeout(hideFlag, 5000);
    return () => clearTimeout(t);
  }, [flag, hideFlag]);
  return (
    <div>
      {flag && (
        <div className="flag" role="status">
          <span>{flag.text}</span>
          {flag.undo && (
            <button className="link-btn" type="button" onClick={() => { flag.undo?.(); hideFlag(); }}>
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
