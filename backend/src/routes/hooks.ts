import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { db } from "../db/client.js";
import { hooks } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import {
  CreateHookRequestSchema,
  UpdateHookRequestSchema,
  type Hook,
} from "@hookdump/shared";

export async function hookRoutes(fastify: FastifyInstance) {
  // Create hook
  fastify.post("/api/hooks", async (request, reply) => {
    const parseResult = CreateHookRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

    const {
      name,
      responseStatusCode,
      responseHeaders,
      responseBody,
      forwardUrl,
      signatureSecret,
      monitorEnabled,
      monitorTimeoutMinutes,
      monitorNotifyEmail,
      monitorSlackWebhook,
      monitorDiscordWebhook,
    } = parseResult.data;
    const id = ulid();
    const now = new Date().toISOString();

    await db.insert(hooks).values({
      id,
      name,
      responseStatusCode: responseStatusCode ?? 200,
      responseHeaders: JSON.stringify(responseHeaders ?? {}),
      responseBody: responseBody ?? "",
      forwardUrl: forwardUrl ?? null,
      signatureSecret: signatureSecret ?? null,
      monitorEnabled: monitorEnabled ?? false,
      monitorTimeoutMinutes: monitorTimeoutMinutes ?? null,
      monitorNotifyEmail: monitorNotifyEmail ?? null,
      monitorSlackWebhook: monitorSlackWebhook ?? null,
      monitorDiscordWebhook: monitorDiscordWebhook ?? null,
      createdAt: now,
    });

    const hook: Hook = {
      id,
      name,
      responseStatusCode: responseStatusCode ?? 200,
      responseHeaders: responseHeaders ?? {},
      responseBody: responseBody ?? "",
      forwardUrl: forwardUrl ?? null,
      signatureSecret: signatureSecret ?? null,
      monitorEnabled: monitorEnabled ?? false,
      monitorTimeoutMinutes: monitorTimeoutMinutes ?? null,
      monitorNotifyEmail: monitorNotifyEmail ?? null,
      monitorSlackWebhook: monitorSlackWebhook ?? null,
      monitorDiscordWebhook: monitorDiscordWebhook ?? null,
      monitorLastAlertAt: null,
      lastEventAt: null,
      createdAt: now,
    };

    return reply.status(201).send(hook);
  });

  // List hooks
  fastify.get("/api/hooks", async (_request, reply) => {
    const allHooks = await db
      .select()
      .from(hooks)
      .orderBy(desc(hooks.createdAt));

    const result: Hook[] = allHooks.map((h) => ({
      id: h.id,
      name: h.name,
      responseStatusCode: h.responseStatusCode,
      responseHeaders: JSON.parse(h.responseHeaders),
      responseBody: h.responseBody,
      forwardUrl: h.forwardUrl,
      signatureSecret: h.signatureSecret,
      monitorEnabled: h.monitorEnabled,
      monitorTimeoutMinutes: h.monitorTimeoutMinutes,
      monitorNotifyEmail: h.monitorNotifyEmail,
      monitorSlackWebhook: h.monitorSlackWebhook,
      monitorDiscordWebhook: h.monitorDiscordWebhook,
      monitorLastAlertAt: h.monitorLastAlertAt,
      lastEventAt: h.lastEventAt,
      createdAt: h.createdAt,
    }));

    return reply.send(result);
  });

  // Get single hook
  fastify.get<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;

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

    const result: Hook = {
      id: hook.id,
      name: hook.name,
      responseStatusCode: hook.responseStatusCode,
      responseHeaders: JSON.parse(hook.responseHeaders),
      responseBody: hook.responseBody,
      forwardUrl: hook.forwardUrl,
      signatureSecret: hook.signatureSecret,
      monitorEnabled: hook.monitorEnabled,
      monitorTimeoutMinutes: hook.monitorTimeoutMinutes,
      monitorNotifyEmail: hook.monitorNotifyEmail,
      monitorSlackWebhook: hook.monitorSlackWebhook,
      monitorDiscordWebhook: hook.monitorDiscordWebhook,
      monitorLastAlertAt: hook.monitorLastAlertAt,
      lastEventAt: hook.lastEventAt,
      createdAt: hook.createdAt,
    };

    return reply.send(result);
  });

  // Update hook
  fastify.patch<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;

    const parseResult = UpdateHookRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parseResult.error.message,
      });
    }

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

    const updates: Record<string, unknown> = {};
    const data = parseResult.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.responseStatusCode !== undefined)
      updates.responseStatusCode = data.responseStatusCode;
    if (data.responseHeaders !== undefined)
      updates.responseHeaders = JSON.stringify(data.responseHeaders);
    if (data.responseBody !== undefined)
      updates.responseBody = data.responseBody;
    if (data.forwardUrl !== undefined) updates.forwardUrl = data.forwardUrl;
    if (data.signatureSecret !== undefined)
      updates.signatureSecret = data.signatureSecret;
    if (data.monitorEnabled !== undefined)
      updates.monitorEnabled = data.monitorEnabled;
    if (data.monitorTimeoutMinutes !== undefined)
      updates.monitorTimeoutMinutes = data.monitorTimeoutMinutes;
    if (data.monitorNotifyEmail !== undefined)
      updates.monitorNotifyEmail = data.monitorNotifyEmail;
    if (data.monitorSlackWebhook !== undefined)
      updates.monitorSlackWebhook = data.monitorSlackWebhook;
    if (data.monitorDiscordWebhook !== undefined)
      updates.monitorDiscordWebhook = data.monitorDiscordWebhook;

    if (Object.keys(updates).length > 0) {
      await db.update(hooks).set(updates).where(eq(hooks.id, hookId));
    }

    const updatedHook = await db
      .select()
      .from(hooks)
      .where(eq(hooks.id, hookId))
      .get();

    const result: Hook = {
      id: updatedHook!.id,
      name: updatedHook!.name,
      responseStatusCode: updatedHook!.responseStatusCode,
      responseHeaders: JSON.parse(updatedHook!.responseHeaders),
      responseBody: updatedHook!.responseBody,
      forwardUrl: updatedHook!.forwardUrl,
      signatureSecret: updatedHook!.signatureSecret,
      monitorEnabled: updatedHook!.monitorEnabled,
      monitorTimeoutMinutes: updatedHook!.monitorTimeoutMinutes,
      monitorNotifyEmail: updatedHook!.monitorNotifyEmail,
      monitorSlackWebhook: updatedHook!.monitorSlackWebhook,
      monitorDiscordWebhook: updatedHook!.monitorDiscordWebhook,
      monitorLastAlertAt: updatedHook!.monitorLastAlertAt,
      lastEventAt: updatedHook!.lastEventAt,
      createdAt: updatedHook!.createdAt,
    };

    return reply.send(result);
  });

  // Delete hook
  fastify.delete<{
    Params: { hookId: string };
  }>("/api/hooks/:hookId", async (request, reply) => {
    const { hookId } = request.params;

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

    await db.delete(hooks).where(eq(hooks.id, hookId));

    return reply.status(204).send();
  });
}
