import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { db } from "../db/client.js";
import { hooks, events } from "../db/schema.js";
import { eq, desc, count } from "drizzle-orm";
import { config } from "../config.js";

export async function webhookRoutes(fastify: FastifyInstance) {
  // Receive webhook - supports all HTTP methods
  fastify.all<{
    Params: { hookId: string };
  }>("/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;

    // Check if hook exists
    const hook = await db
      .select()
      .from(hooks)
      .where(eq(hooks.id, hookId))
      .get();

    if (!hook) {
      return reply.status(404).send({
        error: "not_found",
        message: "Hook not found",
      });
    }

    // Get request body as string
    let body: string | null = null;
    if (request.body !== undefined && request.body !== null) {
      if (typeof request.body === "string") {
        body = request.body;
      } else if (Buffer.isBuffer(request.body)) {
        body = request.body.toString("utf-8");
      } else {
        body = JSON.stringify(request.body);
      }
    }

    // Create event
    const eventId = ulid();
    const now = new Date().toISOString();

    await db.insert(events).values({
      id: eventId,
      hookId,
      method: request.method,
      path: request.url,
      headers: JSON.stringify(request.headers),
      body,
      contentType: (request.headers["content-type"] as string) || null,
      createdAt: now,
    });

    // Ring buffer: delete oldest events if over limit
    const eventCount = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.hookId, hookId))
      .get();

    if (eventCount && eventCount.count > config.maxEventsPerHook) {
      const excess = eventCount.count - config.maxEventsPerHook;
      const oldestEvents = await db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.hookId, hookId))
        .orderBy(events.createdAt)
        .limit(excess);

      for (const event of oldestEvents) {
        await db.delete(events).where(eq(events.id, event.id));
      }
    }

    return reply.status(200).send({
      success: true,
      eventId,
    });
  });
}
