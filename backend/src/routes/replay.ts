import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { request as httpRequest } from "undici";
import { db } from "../db/client.js";
import { events, replays } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { CreateReplayRequestSchema, type Replay } from "@hookdump/shared";

export async function replayRoutes(fastify: FastifyInstance) {
  // Create replay (send event to target URL)
  fastify.post<{
    Params: { eventId: string };
  }>("/api/events/:eventId/replay", async (request, reply) => {
    const { eventId } = request.params;

    const parseResult = CreateReplayRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

    const { targetUrl } = parseResult.data;

    // Get original event
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .get();

    if (!event) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    const replayId = ulid();
    const now = new Date().toISOString();

    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let error: string | null = null;

    try {
      // Prepare headers (filter out hop-by-hop headers)
      const originalHeaders = JSON.parse(event.headers);
      const filteredHeaders: Record<string, string> = {};
      const hopByHopHeaders = [
        "connection",
        "keep-alive",
        "proxy-authenticate",
        "proxy-authorization",
        "te",
        "trailers",
        "transfer-encoding",
        "upgrade",
        "host",
      ];

      for (const [key, value] of Object.entries(originalHeaders)) {
        if (!hopByHopHeaders.includes(key.toLowerCase())) {
          filteredHeaders[key] = String(value);
        }
      }

      // Send request
      const response = await httpRequest(targetUrl, {
        method: event.method as
          | "GET"
          | "POST"
          | "PUT"
          | "DELETE"
          | "PATCH"
          | "HEAD"
          | "OPTIONS",
        headers: filteredHeaders,
        body: event.body || undefined,
      });

      statusCode = response.statusCode;
      responseBody = await response.body.text();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    // Save replay result
    await db.insert(replays).values({
      id: replayId,
      eventId,
      targetUrl,
      statusCode,
      responseBody,
      error,
      createdAt: now,
    });

    const result: Replay = {
      id: replayId,
      eventId,
      targetUrl,
      statusCode,
      responseBody,
      error,
      createdAt: now,
    };

    return reply.status(201).send(result);
  });

  // List replays for an event
  fastify.get<{
    Params: { eventId: string };
  }>("/api/events/:eventId/replays", async (request, reply) => {
    const { eventId } = request.params;

    // Check if event exists
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .get();

    if (!event) {
      return reply.status(404).send({
        error: "not_found",
        message: "Event not found",
      });
    }

    const replayList = await db
      .select()
      .from(replays)
      .where(eq(replays.eventId, eventId))
      .orderBy(desc(replays.createdAt));

    const result: Replay[] = replayList.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      targetUrl: r.targetUrl,
      statusCode: r.statusCode,
      responseBody: r.responseBody,
      error: r.error,
      createdAt: r.createdAt,
    }));

    return reply.send(result);
  });
}
