export function Win98Dialog({
  open,
  title = 'Confirm',
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmTone = 'default',
}) {
  if (!open) return null;

  return (
    <div className="win98-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="win98-dialog-title" onClick={onCancel}>
      <div className="win98-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="win98-dialog-titlebar">
          <h3 id="win98-dialog-title" className="win98-dialog-title">{title}</h3>
          <button type="button" className="win98-dialog-close" onClick={onCancel} aria-label="Close dialog">×</button>
        </div>
        <div className="win98-dialog-body">
          <span className="win98-dialog-icon" aria-hidden>{confirmTone === 'danger' ? '!' : 'i'}</span>
          <p className="win98-dialog-message">{message}</p>
        </div>
        <div className="win98-dialog-actions">
          <button
            type="button"
            className={`btn btn-secondary${confirmTone === 'danger' ? ' win98-dialog-confirm-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
