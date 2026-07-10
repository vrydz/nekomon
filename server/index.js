import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { migrate } from "./db/migrate.js";
import { getStoreBackend } from "./store/index.js";
import usersRouter from "./routes/users.js";
import analyzeRouter from "./routes/analyze.js";
import catchesRouter from "./routes/catches.js";
import leaderboardRouter from "./routes/leaderboard.js";
import mapRouter from "./routes/map.js";
import configRouter from "./routes/config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors(
    allowedOrigins?.length
      ? {
          origin(origin, cb) {
            if (!origin || allowedOrigins.includes(origin)) cb(null, true);
            else cb(new Error("CORS blocked"));
          },
        }
      : undefined
  )
);
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    ai: process.env.AI_PROVIDER || "mock",
    store: getStoreBackend(),
  });
});

app.use("/api/users", usersRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/catches", catchesRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/map", mapRouter);
app.use("/api/config", configRouter);

async function start() {
  try {
    await migrate();

    if (process.env.NODE_ENV === "production") {
      const dist = join(__dirname, "..", "dist");
      app.use(express.static(dist, { maxAge: "1d", index: false }));
      app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));
    } else {
      console.log("Initializing Vite dev middleware...");
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Stray Cat Hunter running on http://0.0.0.0:${PORT} [store=${getStoreBackend()}]`);
    });
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
