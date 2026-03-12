import Fastify from "fastify";
import cors from "@fastify/cors";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./database.js";
import { getAggregateProduction, getDashboardData, getOperatorAnalytics, getOperatorDetail, getSourceMeta, getWellDetail, getWellGeoJson, searchWells } from "./queries.js";

interface AppOptions {
  dbPath?: string;
}

export async function createApp(options: AppOptions = {}) {
  const app = Fastify({ logger: true });
  const db = openDatabase(options.dbPath);

  await app.register(cors, {
    origin: true,
  });

  app.addHook("onClose", async () => {
    db.close();
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/api/meta/source", async () => {
    return getSourceMeta(db);
  });

  app.get("/api/dashboard", async () => {
    return getDashboardData(db);
  });

  app.get("/api/dashboard/production", async () => {
    return getAggregateProduction(db);
  });

  app.get("/api/wells/geo", async () => {
    return getWellGeoJson(db);
  });

  app.get("/api/operators", async () => {
    return getOperatorAnalytics(db);
  });

  app.get("/api/operators/:operatorId", async (request, reply) => {
    const operatorId = Number.parseInt((request.params as { operatorId: string }).operatorId, 10);
    if (Number.isNaN(operatorId)) {
      reply.code(400);
      return { message: "Invalid operator ID." };
    }

    const detail = getOperatorDetail(db, operatorId);
    if (!detail) {
      reply.code(404);
      return { message: "Operator not found." };
    }

    return detail;
  });

  app.get("/api/wells", async (request) => {
    return searchWells(db, request.query as Record<string, unknown>);
  });

  app.get("/api/wells/:waNum", async (request, reply) => {
    const waNum = Number.parseInt((request.params as { waNum: string }).waNum, 10);
    if (Number.isNaN(waNum)) {
      reply.code(400);
      return { message: "Invalid WA number." };
    }

    const detail = getWellDetail(db, waNum);
    if (!detail) {
      reply.code(404);
      return { message: "Well not found." };
    }

    return detail;
  });

  return app;
}

async function start() {
  const app = await createApp();
  const port = Number.parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
