import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CloseIcon } from "./ui";

type Props = {
  id: string;
  title: string;
  submitLabel: string;
  danger?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  footerStart?: ReactNode;
  children: ReactNode;
};

/* Native <dialog> with showModal(): traps focus. On close, focus goes back to the button that opened it. */
export function Modal({ id, title, submitLabel, danger, onClose, onSubmit, footerStart, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // Remember the opener during the first render, before the dialog takes focus.
  const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>(".modal-body input, .modal-body select, .modal-body textarea, .modal-foot > .btn--subtle")?.focus();
    }
  }, []);
  useEffect(() => () => {
    // Runs after the dialog is gone, so the opener is no longer inert.
    setTimeout(() => { if (opener?.isConnected) opener.focus(); });
  }, [opener]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby={`${id}Title`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      <form onSubmit={submit} noValidate>
        <div className="modal-head">
          <h2 id={`${id}Title`}>{title}</h2>
          <button className="btn btn--subtle btn--icon" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-foot">
          {footerStart && <div className="modal-foot-start">{footerStart}</div>}
          <button className="btn btn--subtle" type="button" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? "btn--danger" : "btn--primary"}`} type="submit">{submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}
