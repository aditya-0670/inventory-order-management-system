export default function Button({
  children,
  type = "button",
  variant = "primary",
  className = "",
  icon: Icon,
  iconPosition = "left",
  ...props
}) {
  return (
    <button type={type} className={`button button-${variant} ${className}`} {...props}>
      {Icon && iconPosition === "left" ? <Icon aria-hidden="true" size={16} strokeWidth={2.3} /> : null}
      {children}
      {Icon && iconPosition === "right" ? <Icon aria-hidden="true" size={16} strokeWidth={2.3} /> : null}
    </button>
  );
}
