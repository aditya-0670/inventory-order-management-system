export default function StatusBadge({ children, tone = "neutral", icon: Icon, className = "" }) {
  return (
    <span className={`status-badge status-badge-${tone} ${className}`}>
      {Icon ? <Icon aria-hidden="true" size={14} strokeWidth={2.4} /> : null}
      <span>{children}</span>
    </span>
  );
}
