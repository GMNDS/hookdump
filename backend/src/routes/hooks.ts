import { FastifyInstance } from "fastify";
import { ulid } from "ulid";
import { db } from "../db/client.js";
import { hooks } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { CreateHookRequestSchema, type Hook } from "@hookdump/shared";

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

    const { name } = parseResult.data;
    const id = ulid();
    const now = new Date().toISOString();

    await db.insert(hooks).values({
      id,
      name,
      createdAt: now,
    });

    const hook: Hook = {
      id,
      name,
      createdAt: now,
    };

    return reply.status(201).send(hook);
  });

  // List hooks
  fastify.get("/api/hooks", async (request, reply) => {
    const allHooks = await db
      .select()
      .from(hooks)
      .orderBy(desc(hooks.createdAt));

    const result: Hook[] = allHooks.map((h) => ({
      id: h.id,
      name: h.name,
      createdAt: h.createdAt,
    }));

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
