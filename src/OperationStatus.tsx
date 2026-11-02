export function OperationStatus({ label }: { label: string }) {
  return <div className="operation-status" role="status" aria-live="polite"><span className="operation-spinner" aria-hidden="true"/><span><strong>{label}</strong><small>Your changes are being saved securely.</small></span><span className="operation-progress" aria-hidden="true"/></div>;
}
