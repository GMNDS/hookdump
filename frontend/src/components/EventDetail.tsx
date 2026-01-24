import type { Event } from "../types";

interface EventDetailProps {
  event: Event | null;
  onReplay: () => void;
}

export function EventDetail({ event, onReplay }: EventDetailProps) {
  const formatJson = (str: string | null): string => {
    if (!str) return "";
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  if (!event) {
    return (
      <div className="panel event-detail">
        <div className="panel-header">
          <h2>Event Detail</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select an event to view details</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel event-detail">
      <div className="panel-header">
        <h2>Event Detail</h2>
        <button className="btn btn-primary btn-small" onClick={onReplay}>
          Replay
        </button>
      </div>
      <div className="panel-content">
        <div className="detail-section">
          <h3>Request Info</h3>
          <div className="detail-content">
            <div className="header-row">
              <span className="header-key">Method</span>
              <span className="header-value">{event.method}</span>
            </div>
            <div className="header-row">
              <span className="header-key">Path</span>
              <span className="header-value">{event.path}</span>
            </div>
            <div className="header-row">
              <span className="header-key">Content-Type</span>
              <span className="header-value">
                {event.contentType || "N/A"}
              </span>
            </div>
            <div className="header-row">
              <span className="header-key">Received At</span>
              <span className="header-value">
                {formatDate(event.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Headers</h3>
          <div className="detail-content">
            {Object.entries(event.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <span className="header-key">{key}</span>
                <span className="header-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h3>Body</h3>
          <div className="detail-content">
            <pre>{event.body ? formatJson(event.body) : "(empty)"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
