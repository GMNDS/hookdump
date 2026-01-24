import { z } from "zod";

// Hook schema
export const HookSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export type Hook = z.infer<typeof HookSchema>;

// Event schema
export const EventSchema = z.object({
  id: z.string(),
  hookId: z.string(),
  method: z.string(),
  path: z.string(),
  headers: z.record(z.string()),
  body: z.string().nullable(),
  contentType: z.string().nullable(),
  createdAt: z.string(),
});

export type Event = z.infer<typeof EventSchema>;

// Replay schema
export const ReplaySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  targetUrl: z.string(),
  statusCode: z.number().nullable(),
  responseBody: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
});

export type Replay = z.infer<typeof ReplaySchema>;

// API Request/Response schemas
export const CreateHookRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export type CreateHookRequest = z.infer<typeof CreateHookRequestSchema>;

export const CreateHookResponseSchema = HookSchema;

export type CreateHookResponse = z.infer<typeof CreateHookResponseSchema>;

export const ListHooksResponseSchema = z.array(HookSchema);

export type ListHooksResponse = z.infer<typeof ListHooksResponseSchema>;

export const ListEventsResponseSchema = z.object({
  events: z.array(EventSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

export type ListEventsResponse = z.infer<typeof ListEventsResponseSchema>;

export const GetEventResponseSchema = EventSchema;

export type GetEventResponse = z.infer<typeof GetEventResponseSchema>;

export const CreateReplayRequestSchema = z.object({
  targetUrl: z.string().url(),
});

export type CreateReplayRequest = z.infer<typeof CreateReplayRequestSchema>;

export const CreateReplayResponseSchema = ReplaySchema;

export type CreateReplayResponse = z.infer<typeof CreateReplayResponseSchema>;

export const ListReplaysResponseSchema = z.array(ReplaySchema);

export type ListReplaysResponse = z.infer<typeof ListReplaysResponseSchema>;

// API Error schema
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
