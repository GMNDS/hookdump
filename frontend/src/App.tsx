import { useState, useEffect, useCallback } from "react";
import { HookList } from "./components/HookList";
import { EventList } from "./components/EventList";
import { EventDetail } from "./components/EventDetail";
import { ReplayModal } from "./components/ReplayModal";
import { HookSettings } from "./components/HookSettings";
import { api } from "./api/client";
import type { Hook, Event } from "./types";

type MobileTab = "hooks" | "events" | "detail";

function App() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("hooks");

  const loadHooks = useCallback(async () => {
    try {
      const data = await api.listHooks();
      setHooks(data);
    } catch (err) {
      console.error("Failed to load hooks:", err);
    }
  }, []);

  useEffect(() => {
    loadHooks();
    // Load config
    api.getConfig().then((config) => {
      setDemoMode(config.demoMode);
    }).catch(() => {
      // Ignore config errors
    });
  }, [loadHooks]);

  const handleCreateHook = async (name: string) => {
    try {
      const hook = await api.createHook({ name });
      setHooks((prev) => [hook, ...prev]);
      setSelectedHook(hook);
      setSelectedEvent(null);
      setMobileTab("events");
    } catch (err) {
      console.error("Failed to create hook:", err);
    }
  };

  const handleSelectHook = (hook: Hook) => {
    setSelectedHook(hook);
    setSelectedEvent(null);
    setMobileTab("events");
  };

  const handleDeleteHook = async (hookId: string) => {
    try {
      await api.deleteHook(hookId);
      setHooks((prev) => prev.filter((h) => h.id !== hookId));
      if (selectedHook?.id === hookId) {
        setSelectedHook(null);
        setSelectedEvent(null);
        setMobileTab("hooks");
      }
    } catch (err) {
      console.error("Failed to delete hook:", err);
    }
  };

  const handleUpdateHook = (updatedHook: Hook) => {
    setHooks((prev) =>
      prev.map((h) => (h.id === updatedHook.id ? updatedHook : h))
    );
    if (selectedHook?.id === updatedHook.id) {
      setSelectedHook(updatedHook);
    }
  };

  const handleSelectEvent = async (eventId: string) => {
    try {
      const event = await api.getEvent(eventId);
      setSelectedEvent(event);
      setMobileTab("detail");
    } catch (err) {
      console.error("Failed to load event:", err);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await api.deleteEvent(eventId);
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
        setMobileTab("events");
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  const selectedEventLabel = selectedEvent
    ? `${selectedEvent.method} ${selectedEvent.path}`
    : "No event selected";

  return (
    <div className="app">
      {demoMode && (
        <div className="demo-banner">
          Demo Mode - Data resets daily. Don't send sensitive data.{" "}
          <a href="https://github.com/orangekame3/hookdump" target="_blank" rel="noopener noreferrer">
            Self-host for production
          </a>
        </div>
      )}
      <header className="header">
        <h1>Hookdump</h1>
        <span className="subtitle">Webhook Debugger</span>
      </header>
      <div className="mobile-nav" role="navigation" aria-label="Primary sections">
        <div className="mobile-topbar">
          <h1>Hookdump</h1>
          <div className="mobile-context">
            <span>{selectedHook?.name ?? "No hook selected"}</span>
            <span>{selectedEventLabel}</span>
          </div>
        </div>
        <div className="mobile-tabs" role="tablist" aria-label="Mobile panels">
          <button
            className={`mobile-tab ${mobileTab === "hooks" ? "active" : ""}`}
            onClick={() => setMobileTab("hooks")}
            role="tab"
            aria-selected={mobileTab === "hooks"}
          >
            Hooks
          </button>
          <button
            className={`mobile-tab ${mobileTab === "events" ? "active" : ""}`}
            onClick={() => setMobileTab("events")}
            role="tab"
            aria-selected={mobileTab === "events"}
            disabled={!selectedHook}
          >
            Events
          </button>
          <button
            className={`mobile-tab ${mobileTab === "detail" ? "active" : ""}`}
            onClick={() => setMobileTab("detail")}
            role="tab"
            aria-selected={mobileTab === "detail"}
            disabled={!selectedEvent}
          >
            Detail
          </button>
        </div>
      </div>
      <main className="main">
        <section
          className={`app-panel app-panel-hooks ${mobileTab === "hooks" ? "is-active" : ""}`}
        >
          <HookList
            hooks={hooks}
            selectedHook={selectedHook}
            onSelect={handleSelectHook}
            onCreate={handleCreateHook}
            onDelete={handleDeleteHook}
            onSettings={() => setShowSettingsModal(true)}
          />
        </section>
        <section
          className={`app-panel app-panel-events ${mobileTab === "events" ? "is-active" : ""}`}
        >
          <EventList
            hook={selectedHook}
            onSelectEvent={handleSelectEvent}
            selectedEventId={selectedEvent?.id}
            onDeleteEvent={handleDeleteEvent}
            onDeleteAllEvents={async (hookId: string) => {
              await api.deleteAllEventsForHook(hookId);
              setSelectedEvent(null);
              setMobileTab("events");
            }}
          />
        </section>
        <section
          className={`app-panel app-panel-detail ${mobileTab === "detail" ? "is-active" : ""}`}
        >
          <EventDetail
            event={selectedEvent}
            onReplay={() => setShowReplayModal(true)}
          />
        </section>
      </main>
      {showReplayModal && selectedEvent && (
        <ReplayModal
          event={selectedEvent}
          onClose={() => setShowReplayModal(false)}
        />
      )}
      {showSettingsModal && selectedHook && (
        <HookSettings
          hook={selectedHook}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={handleUpdateHook}
        />
      )}
    </div>
  );
}

export default App;
