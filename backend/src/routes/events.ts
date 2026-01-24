import { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { events, hooks } from "../db/schema.js";
import { eq, desc, count } from "drizzle-orm";
import type { Event, ListEventsResponse } from "@hookdump/shared";

export async function eventRoutes(fastify: FastifyInstance) {
  // List events for a hook
  fastify.get<{
    Params: { hookId: string };
    Querystring: { page?: string; pageSize?: string };
  }>("/api/hooks/:hookId/events", async (request, reply) => {
    const { hookId } = request.params;
    const page = parseInt(request.query.page || "1", 10);
    const pageSize = Math.min(parseInt(request.query.pageSize || "20", 10), 100);

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

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(events)
      .where(eq(events.hookId, hookId))
      .get();

    const total = totalResult?.count || 0;

    // Get events with pagination
    const offset = (page - 1) * pageSize;
    const eventList = await db
      .select()
      .from(events)
      .where(eq(events.hookId, hookId))
      .orderBy(desc(events.createdAt))
      .limit(pageSize)
      .offset(offset);

    const result: ListEventsResponse = {
      events: eventList.map((e) => ({
        id: e.id,
        hookId: e.hookId,
        method: e.method,
        path: e.path,
        headers: JSON.parse(e.headers),
        body: e.body,
        contentType: e.contentType,
        createdAt: e.createdAt,
      })),
      total,
      page,
      pageSize,
    };

    return reply.send(result);
  });

  // Get single event
  fastify.get<{
    Params: { eventId: string };
  }>("/api/events/:eventId", async (request, reply) => {
    const { eventId } = request.params;

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

    const result: Event = {
      id: event.id,
      hookId: event.hookId,
      method: event.method,
      path: event.path,
      headers: JSON.parse(event.headers),
      body: event.body,
      contentType: event.contentType,
      createdAt: event.createdAt,
    };

    return reply.send(result);
  });

  // Delete event
  fastify.delete<{
    Params: { eventId: string };
  }>("/api/events/:eventId", async (request, reply) => {
    const { eventId } = request.params;

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

    await db.delete(events).where(eq(events.id, eventId));

    return reply.status(204).send();
  });
}
