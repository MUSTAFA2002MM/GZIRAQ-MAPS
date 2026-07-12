import { useEffect } from "react";

export default function MessageBanner({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message || !onClose) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [message, onClose, type]);

  if (!message) {
    return null;
  }

  return (
    <div className={`status-message ${type}`} role="status">
      <span>{message}</span>
      {onClose && (
        <button
          className="status-close"
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
        >
          ×
        </button>
      )}
    </div>
  );
}
