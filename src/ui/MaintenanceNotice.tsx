import '../styles/maintenance-notice.css';

// Temporary notice for 18 November 2026. Set false to remove it from both pages.
const showMaintenanceNotice = true;

export function MaintenanceNotice() {
  if (!showMaintenanceNotice) return null;
  return <aside className="maintenance-note" aria-label="Temporary maintenance notice">
    <span className="maintenance-note-spark" aria-hidden="true">✳</span>
    <p><strong>Quite the welcome!</strong> A little maintenance after an overwhelming response. <span className="maintenance-note-return">Back by <time dateTime="2026-11-18T13:30:00+05:30">1:30 PM IST today, 18 Nov.</time></span></p>
  </aside>;
}
