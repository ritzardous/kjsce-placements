export function OperationStatus({ label }: { label: string }) {
  return <div className="operation-status" role="status" aria-live="polite"><span className="operation-spinner" aria-hidden="true"/><span><strong>{label}</strong><small>Keep this page open while this finishes.</small></span><span className="operation-progress" aria-hidden="true"/></div>;
}
