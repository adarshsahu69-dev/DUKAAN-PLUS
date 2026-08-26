import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db/index.js";
import { config, isProd } from "./config.js";
import { errorHandler } from "./utils/errors.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { bootstrapAdmin } from "./routes/auth.js";
import { authRouter } from "./routes/auth.js";
import { userRouter } from "./routes/auth.js";
import { catalogRouter } from "./routes/catalog.js";
import { transactionRouter } from "./routes/transactions.js";
import { reportRouter } from "./routes/reports.js";
import { syncRouter } from "./routes/sync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function applySchema() {
  try {
    const schemaPath = path.join(__dirname, "db", "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    await pool.query(sql);
    console.log("[db] schema applied");
  } catch (err) {
    console.error("[db] schema application skipped/failed:", (err as Error).message);
  }
}

async function start() {
  await applySchema();
  await bootstrapAdmin();

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.clientOrigin === "*" ? true : config.clientOrigin.split(","),
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan(isProd ? "combined" : "dev"));
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api", catalogRouter);
  app.use("/api", transactionRouter);
  app.use("/api/reports", reportRouter);
  app.use("/api/sync", syncRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  const server = app.listen(config.port, () => {
    console.log(`[server] listening on port ${config.port} (${config.nodeEnv})`);
  });
  server.on("error", (e) => console.error("[server] error", e));
}

start().catch((err) => {
  console.error("[server] failed to start", err);
  process.exit(1);
});
