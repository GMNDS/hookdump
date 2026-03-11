import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { Hook, Event } from "../types";

interface EventListProps {
  hook: Hook | null;
  selectedEventId: string | undefined;
  onSelectEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => Promise<void> | void;
  onDeleteAllEvents: (hookId: string) => Promise<void> | void;
}

type DeleteMode = "single" | "selected" | "all";

export function EventList({
  hook,
  selectedEventId,
  onSelectEvent,
  onDeleteEvent,
  onDeleteAllEvents,
}: EventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteCandidate, setDeleteCandidate] = useState<Event | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pageSize = 20;

  const loadEvents = useCallback(async () => {
    if (!hook) return;

    setLoading(true);
    try {
      const data = await api.listEvents(hook.id, page, pageSize);
      setEvents(data.events);
      setTotal(data.total);
      setSelectedIds((prev) => {
        const next = new Set<string>();
        for (const event of data.events) {
          if (prev.has(event.id)) {
            next.add(event.id);
          }
        }
        return next;
      });
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
      setSelectedIds(new Set());
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
  const allOnPageSelected =
    events.length > 0 && events.every((event) => selectedIds.has(event.id));

  const toggleOne = (eventId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const event of events) {
          next.delete(event.id);
        }
      } else {
        for (const event of events) {
          next.add(event.id);
        }
      }
      return next;
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setDeleteCandidate(event);
    setDeleteMode("single");
  };

  const openDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteMode("selected");
    setDeleteCandidate(null);
  };

  const openDeleteAll = () => {
    if (total === 0) return;
    setDeleteMode("all");
    setDeleteCandidate(null);
  };

  const confirmDelete = async () => {
    if (!hook || !deleteMode) {
      return;
    }

    setIsDeleting(true);
    try {
      if (deleteMode === "single" && deleteCandidate) {
        await onDeleteEvent(deleteCandidate.id);
      } else if (deleteMode === "selected") {
        const ids = [...selectedIds];
        await Promise.all(ids.map((id) => Promise.resolve(onDeleteEvent(id))));
        setSelectedIds(new Set());
      } else if (deleteMode === "all") {
        await onDeleteAllEvents(hook.id);
        setSelectedIds(new Set());
      }

      setDeleteCandidate(null);
      setDeleteMode(null);
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete event(s):", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (isDeleting) {
      return;
    }
    setDeleteCandidate(null);
    setDeleteMode(null);
  };

  const getDeleteModalTitle = () => {
    if (deleteMode === "all") return "Delete All Events";
    if (deleteMode === "selected") return "Delete Selected Events";
    return "Delete Event";
  };

  const getDeleteButtonLabel = () => {
    if (isDeleting) return "Deleting...";
    if (deleteMode === "all") return "Delete All";
    if (deleteMode === "selected") return `Delete ${selectedIds.size} Selected`;
    return "Delete Event";
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

      {events.length > 0 && (
        <div className="event-bulk-actions">
          <label className="event-checkbox-label">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleAllOnPage}
            />
            Select page
          </label>
          <button
            className="btn btn-secondary btn-small"
            onClick={openDeleteSelected}
            disabled={selectedIds.size === 0 || isDeleting}
          >
            Delete Selected ({selectedIds.size})
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={openDeleteAll}
            disabled={total === 0 || isDeleting}
          >
            Delete All ({total})
          </button>
        </div>
      )}

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
              <label className="event-row-checkbox" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(event.id)}
                  onChange={() => toggleOne(event.id)}
                />
              </label>
              <div className="event-info">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className={`event-method ${getMethodClass(event.method)}`}>
                    {event.method}
                  </span>
                  {event.signatureProvider && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        background: event.signatureValid
                          ? "rgba(74, 222, 128, 0.2)"
                          : "rgba(248, 113, 113, 0.2)",
                        color: event.signatureValid ? "#4ade80" : "#f87171",
                      }}
                      title={`${event.signatureProvider}: ${event.signatureValid ? "Valid" : "Invalid"}`}
                    >
                      {event.signatureValid ? "SIG" : "SIG"}
                    </span>
                  )}
                  <span className="event-path">{event.path}</span>
                </div>
                <div className="event-date">{formatDate(event.createdAt)}</div>
              </div>
              <button
                className="btn btn-icon"
                onClick={(e) => handleDeleteClick(e, event)}
                disabled={isDeleting}
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

      {deleteMode && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{getDeleteModalTitle()}</h2>
              <button className="btn btn-icon" onClick={cancelDelete} disabled={isDeleting}>
                X
              </button>
            </div>
            <div className="modal-body">
              {deleteMode === "single" && deleteCandidate && (
                <>
                  <p className="confirm-text">
                    This action cannot be undone. Do you want to delete this captured event?
                  </p>
                  <div className="confirm-event-meta">
                    <span className={`event-method ${getMethodClass(deleteCandidate.method)}`}>
                      {deleteCandidate.method}
                    </span>
                    <span className="confirm-path">{deleteCandidate.path}</span>
                  </div>
                  <div className="confirm-date">{formatFullDate(deleteCandidate.createdAt)}</div>
                </>
              )}

              {deleteMode === "selected" && (
                <p className="confirm-text">
                  This action cannot be undone. Delete {selectedIds.size} selected event(s)?
                </p>
              )}

              {deleteMode === "all" && (
                <p className="confirm-text">
                  This action cannot be undone. Delete all {total} event(s) from this hook?
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete} disabled={isDeleting}>
                Cancel
              </button>
              <button className="btn btn-primary btn-danger" onClick={confirmDelete} disabled={isDeleting}>
                {getDeleteButtonLabel()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
