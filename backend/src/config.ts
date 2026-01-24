export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",
  databasePath: process.env.DATABASE_PATH || "./data/hookdump.db",
  maxEventsPerHook: parseInt(process.env.MAX_EVENTS_PER_HOOK || "100", 10),
};
