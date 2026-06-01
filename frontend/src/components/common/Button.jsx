export default function Button({ children, type = "button", variant = "primary", className = "", ...props }) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
