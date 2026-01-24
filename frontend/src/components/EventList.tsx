import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { Hook, Event } from "../types";

interface EventListProps {
  hook: Hook | null;
  selectedEventId: string | undefined;
  onSelectEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}

export function EventList({
  hook,
  selectedEventId,
  onSelectEvent,
  onDeleteEvent,
}: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const loadEvents = useCallback(async () => {
    if (!hook) return;

    setLoading(true);
    try {
      const data = await api.listEvents(hook.id, page, pageSize);
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }, [hook, page]);

  useEffect(() => {
    if (hook) {
      loadEvents();
    } else {
      setEvents([]);
      setTotal(0);
      setPage(1);
    }
  }, [hook, loadEvents]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!hook) return;

    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, [hook, loadEvents]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getMethodClass = (method: string) => {
    return `method-${method.toLowerCase()}`;
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (confirm("Delete this event?")) {
      onDeleteEvent(eventId);
      // Reload events after deletion
      setTimeout(loadEvents, 100);
    }
  };

  if (!hook) {
    return (
      <div className="panel event-list">
        <div className="panel-header">
          <h2>Events</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>Select a hook to view events</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel event-list">
      <div className="panel-header">
        <h2>Events ({total})</h2>
        <button
          className="btn btn-secondary btn-small"
          onClick={loadEvents}
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      <div className="panel-content">
        {loading && events.length === 0 ? (
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <p>No events yet</p>
            <p style={{ fontSize: "12px", marginTop: "8px" }}>
              Send a request to the webhook URL to see events here
            </p>
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`event-item ${
                selectedEventId === event.id ? "selected" : ""
              }`}
              onClick={() => onSelectEvent(event.id)}
              title={formatFullDate(event.createdAt)}
            >
              <div className="event-info">
                <div>
                  <span className={`event-method ${getMethodClass(event.method)}`}>
                    {event.method}
                  </span>
                  <span className="event-path">{event.path}</span>
                </div>
                <div className="event-date">{formatDate(event.createdAt)}</div>
              </div>
              <button
                className="btn btn-icon"
                onClick={(e) => handleDelete(e, event.id)}
              >
                X
              </button>
            </div>
          ))
        )}
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-small"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
