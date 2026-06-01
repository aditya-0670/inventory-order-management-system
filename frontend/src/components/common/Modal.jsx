import Button from "./Button.jsx";

export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2>{title}</h2>
          {onClose ? (
            <Button variant="ghost" onClick={onClose} aria-label="Close dialog">
              Close
            </Button>
          ) : null}
        </div>
        {children}
      </section>
    </div>
  );
}
