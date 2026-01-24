import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const hooks = sqliteTable("hooks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Custom response configuration
  responseStatusCode: integer("response_status_code").notNull().default(200),
  responseHeaders: text("response_headers").notNull().default("{}"), // JSON string
  responseBody: text("response_body").notNull().default(""),
  // Forwarding configuration
  forwardUrl: text("forward_url"),
  createdAt: text("created_at").notNull(),
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  hookId: text("hook_id")
    .notNull()
    .references(() => hooks.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  path: text("path").notNull(),
  headers: text("headers").notNull(), // JSON string
  body: text("body"),
  contentType: text("content_type"),
  // Forward response data
  forwardStatusCode: integer("forward_status_code"),
  forwardResponseBody: text("forward_response_body"),
  forwardError: text("forward_error"),
  createdAt: text("created_at").notNull(),
});

export const replays = sqliteTable("replays", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  targetUrl: text("target_url").notNull(),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});
