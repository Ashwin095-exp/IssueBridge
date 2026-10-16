export default function ErrorBanner({ message, onRetry, disabled }) {
  return (
    <div className="error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry} disabled={disabled}>
          Retry
        </button>
      )}
    </div>
  );
}
