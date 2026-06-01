export default function SkeletonCard({ lines = 2 }) {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <span className="skeleton-icon" />
      <span className="skeleton-line skeleton-line-short" />
      {Array.from({ length: lines }).map((_, index) => (
        <span className="skeleton-line" key={index} />
      ))}
    </div>
  );
}
