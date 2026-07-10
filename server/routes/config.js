import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    mapboxToken: process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN || "",
    aiProvider: process.env.AI_PROVIDER || "mock",
    requireGps: process.env.REQUIRE_GPS !== "false",
  });
});

export default router;
