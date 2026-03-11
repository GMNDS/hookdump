import { FastifyInstance, FastifyRequest } from "fastify";
import { ulid } from "ulid";
import { request as httpRequest } from "undici";
import { db } from "../db/client.js";
import { hooks, events } from "../db/schema.js";
import { eq, count } from "drizzle-orm";
import { config } from "../config.js";
import { validateSignature } from "../services/signature.js";
import type { BodyEncoding, MultipartPart } from "@hookdump/shared";
import {
  buildForwardBody,
  MULTIPART_PREVIEW_LIMIT_BYTES,
  removeHeaderCaseInsensitive,
} from "../services/event-body.js";

interface CapturedBody {
  bodyText: string | null;
  bodyBase64: string | null;
  bodyEncoding: BodyEncoding | null;
  bodySize: number;
  isBinary: boolean;
  multipartParts: MultipartPart[] | null;
}

function isTextLikeContentType(contentType: string | null): boolean {
  if (!contentType) {
    return true;
  }

  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("x-www-form-urlencoded")
  );
}

function toHeaderRecord(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      result[key] = Array.isArray(value) ? value[0] : value;
    }
  }

  return result;
}

async function captureMultipartBody(
  request: FastifyRequest
): Promise<CapturedBody> {
  const multipartParts: MultipartPart[] = [];
  let totalSize = 0;
  let hasBinary = false;

  for await (const rawPart of request.parts()) {
    const part = rawPart as {
      type: "field" | "file";
      fieldname: string;
      value?: unknown;
      filename?: string;
      mimetype?: string;
      file?: AsyncIterable<Buffer | Uint8Array | string>;
    };

    if (part.type === "field") {
      const fieldValue =
        typeof part.value === "string"
          ? part.value
          : String(part.value ?? "");
      const fieldSize = Buffer.byteLength(fieldValue, "utf8");
      totalSize += fieldSize;

      multipartParts.push({
        kind: "field",
        name: part.fieldname,
        filename: null,
        contentType: null,
        size: fieldSize,
        value: fieldValue,
        dataBase64: null,
        truncated: false,
      });

      continue;
    }

    hasBinary = true;
    const previewChunks: Buffer[] = [];
    let previewSize = 0;
    let fileSize = 0;
    let truncated = false;

    for await (const chunk of part.file ?? []) {
      const bufferChunk = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk);

      fileSize += bufferChunk.length;

      if (previewSize < MULTIPART_PREVIEW_LIMIT_BYTES) {
        const remaining = MULTIPART_PREVIEW_LIMIT_BYTES - previewSize;
        const toStore = Math.min(remaining, bufferChunk.length);
        previewChunks.push(bufferChunk.subarray(0, toStore));
        previewSize += toStore;
        if (toStore < bufferChunk.length) {
          truncated = true;
        }
      } else {
        truncated = true;
      }
    }

    totalSize += fileSize;
    const previewBuffer = Buffer.concat(previewChunks);

    multipartParts.push({
      kind: "file",
      name: part.fieldname,
      filename: part.filename || null,
      contentType: part.mimetype || null,
      size: fileSize,
      value: null,
        dataBase64:
          previewBuffer.length > 0 ? previewBuffer.toString("base64") : null,
      truncated,
    });
  }

  return {
    bodyText: null,
    bodyBase64: null,
    bodyEncoding: "multipart",
    bodySize: totalSize,
    isBinary: hasBinary,
    multipartParts,
  };
}

function captureStandardBody(
  body: unknown,
  contentType: string | null
): CapturedBody {
  if (body === undefined || body === null) {
    return {
      bodyText: null,
      bodyBase64: null,
      bodyEncoding: null,
      bodySize: 0,
      isBinary: false,
      multipartParts: null,
    };
  }

  if (typeof body === "string") {
    return {
      bodyText: body,
      bodyBase64: null,
      bodyEncoding: "utf8",
      bodySize: Buffer.byteLength(body, "utf8"),
      isBinary: false,
      multipartParts: null,
    };
  }

  if (Buffer.isBuffer(body)) {
    const textLike = isTextLikeContentType(contentType);
    return {
      bodyText: textLike ? body.toString("utf8") : null,
      bodyBase64: textLike ? null : body.toString("base64"),
      bodyEncoding: textLike ? "utf8" : "base64",
      bodySize: body.length,
      isBinary: !textLike,
      multipartParts: null,
    };
  }

  const jsonBody = JSON.stringify(body);
  return {
    bodyText: jsonBody,
    bodyBase64: null,
    bodyEncoding: "utf8",
    bodySize: Buffer.byteLength(jsonBody, "utf8"),
    isBinary: false,
    multipartParts: null,
  };
}

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

    const contentTypeHeader = request.headers["content-type"];
    const contentType = Array.isArray(contentTypeHeader)
      ? contentTypeHeader[0]
      : contentTypeHeader || null;

    const capturedBody = request.isMultipart()
      ? await captureMultipartBody(request)
      : captureStandardBody(request.body, contentType);

    // Validate signature if secret is configured
    let signatureProvider: string | null = null;
    let signatureValid: boolean | null = null;

    if (hook.signatureSecret && capturedBody.bodyText) {
      const headersObj = toHeaderRecord(request.headers);

      const result = validateSignature(
        headersObj,
        capturedBody.bodyText,
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

        const forwardBody = buildForwardBody({
          bodyEncoding: capturedBody.bodyEncoding,
          bodyText: capturedBody.bodyText,
          bodyBase64: capturedBody.bodyBase64,
          multipartParts: capturedBody.multipartParts,
        });

        if (forwardBody.isMultipart) {
          removeHeaderCaseInsensitive(filteredHeaders, "content-type");
        }
        removeHeaderCaseInsensitive(filteredHeaders, "content-length");

        if (forwardBody.error) {
          throw new Error(forwardBody.error);
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
          body: forwardBody.body,
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
      body: capturedBody.bodyText,
      bodyText: capturedBody.bodyText,
      bodyBase64: capturedBody.bodyBase64,
      bodyEncoding: capturedBody.bodyEncoding,
      bodySize: capturedBody.bodySize,
      isBinary: capturedBody.isBinary,
      multipartParts: capturedBody.multipartParts
        ? JSON.stringify(capturedBody.multipartParts)
        : null,
      contentType,
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
