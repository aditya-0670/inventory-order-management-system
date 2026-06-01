import { forwardRef } from "react";

const Input = forwardRef(function Input({ label, id, error, ...props }, ref) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} ref={ref} className={error ? "input input-error" : "input"} {...props} />
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
});

export default Input;
