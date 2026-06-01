import { WifiOff } from "lucide-react";

import Button from "./Button.jsx";

export default function ErrorState({
  title = "Unable to load data",
  message = "Unable to connect to the server. Please try again.",
  onRetry,
}) {
  return (
    <div className="error-state" role="alert">
      <div className="error-state-icon" aria-hidden="true">
        <WifiOff size={24} strokeWidth={2.2} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
