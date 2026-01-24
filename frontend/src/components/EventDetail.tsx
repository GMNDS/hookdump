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

  const hasForwardData =
    event.forwardStatusCode !== null ||
    event.forwardResponseBody !== null ||
    event.forwardError !== null;

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
            {event.signatureProvider && (
              <div className="header-row">
                <span className="header-key">Signature</span>
                <span
                  className="header-value"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: 500,
                      background: event.signatureValid
                        ? "rgba(74, 222, 128, 0.15)"
                        : "rgba(248, 113, 113, 0.15)",
                      color: event.signatureValid ? "#4ade80" : "#f87171",
                    }}
                  >
                    {event.signatureValid ? "Valid" : "Invalid"}
                  </span>
                  <span style={{ color: "#888", textTransform: "capitalize" }}>
                    ({event.signatureProvider})
                  </span>
                </span>
              </div>
            )}
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

        {hasForwardData && (
          <div className="detail-section">
            <h3 style={{ color: "#4ade80" }}>Forward Response</h3>
            <div className="detail-content">
              {event.forwardError ? (
                <div style={{ color: "#f87171" }}>
                  Error: {event.forwardError}
                </div>
              ) : (
                <>
                  <div className="header-row">
                    <span className="header-key">Status Code</span>
                    <span
                      className="header-value"
                      style={{
                        color:
                          event.forwardStatusCode &&
                          event.forwardStatusCode >= 200 &&
                          event.forwardStatusCode < 300
                            ? "#4ade80"
                            : "#f87171",
                      }}
                    >
                      {event.forwardStatusCode}
                    </span>
                  </div>
                  {event.forwardResponseBody && (
                    <div style={{ marginTop: "12px" }}>
                      <div style={{ color: "#888", marginBottom: "8px" }}>
                        Response Body:
                      </div>
                      <pre>{formatJson(event.forwardResponseBody)}</pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
