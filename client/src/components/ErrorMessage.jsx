import { AlertCircle, X } from "lucide-react";
import "./ErrorMessage.css";

export default function ErrorMessage({ message, onDismiss, onRetry }) {
  if (!message) return null;
  return (
    <div className="error-card" role="alert">
      <AlertCircle size={20} className="error-card__icon" />
      <div className="error-card__body">
        <p className="error-card__text">{message}</p>
        {onRetry && (
          <button className="error-card__retry" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
      {onDismiss && (
        <button className="error-card__dismiss" onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
