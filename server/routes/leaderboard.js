import { Router } from "express";
import { getLeaderboard } from "../store/index.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const period = req.query.period || "all";
    const rows = await getLeaderboard(period);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal memuat klasemen." });
  }
});

export default router;
