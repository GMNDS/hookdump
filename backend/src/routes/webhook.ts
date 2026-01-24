import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { request as httpRequest } from "undici";
import { db } from "../db/client.js";
import { hooks, events } from "../db/schema.js";
import { eq, count } from "drizzle-orm";
import { config } from "../config.js";
import { validateSignature } from "../services/signature.js";

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

    // Validate signature if secret is configured
    let signatureProvider: string | null = null;
    let signatureValid: boolean | null = null;

    if (hook.signatureSecret && body) {
      const headersObj: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.headers)) {
        if (value) {
          headersObj[key] = Array.isArray(value) ? value[0] : value;
        }
      }

      const result = validateSignature(
        headersObj,
        body,
        hook.signatureSecret,
        request.url
      );

      if (result) {
        signatureProvider = result.provider;
        signatureValid = result.valid;
      }
    }

    // Forward to target URL if configured
    let forwardStatusCode: number | null = null;
    let forwardResponseBody: string | null = null;
    let forwardError: string | null = null;

    if (hook.forwardUrl) {
      try {
        // Prepare headers (filter out hop-by-hop headers)
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

        for (const [key, value] of Object.entries(request.headers)) {
          if (!hopByHopHeaders.includes(key.toLowerCase()) && value) {
            filteredHeaders[key] = Array.isArray(value) ? value[0] : value;
          }
        }

        // Forward the request
        const response = await httpRequest(hook.forwardUrl, {
          method: request.method as
            | "GET"
            | "POST"
            | "PUT"
            | "DELETE"
            | "PATCH"
            | "HEAD"
            | "OPTIONS",
          headers: filteredHeaders,
          body: body || undefined,
        });

        forwardStatusCode = response.statusCode;
        forwardResponseBody = await response.body.text();
      } catch (err) {
        forwardError = err instanceof Error ? err.message : String(err);
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
      signatureProvider,
      signatureValid,
      forwardStatusCode,
      forwardResponseBody,
      forwardError,
      createdAt: now,
    });

    // Update lastEventAt for monitoring
    await db
      .update(hooks)
      .set({ lastEventAt: now })
      .where(eq(hooks.id, hookId));

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

    // Return custom response
    const responseHeaders = JSON.parse(hook.responseHeaders);
    for (const [key, value] of Object.entries(responseHeaders)) {
      reply.header(key, value as string);
    }

    // If custom response body is set, use it
    // Otherwise return default success response
    if (hook.responseBody) {
      return reply.status(hook.responseStatusCode).send(hook.responseBody);
    }

    return reply.status(hook.responseStatusCode).send({
      success: true,
      eventId,
    });
  });
}
