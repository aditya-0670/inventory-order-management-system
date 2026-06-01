import { Loader2 } from "lucide-react";

export default function Loader({ label = "Loading..." }) {
  return (
    <p className="loader" role="status">
      <Loader2 aria-hidden="true" className="loader-icon" size={18} strokeWidth={2.4} />
      <span>{label}</span>
    </p>
  );
}
