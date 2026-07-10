import { Router } from "express";
import { getAllCatches } from "../store/index.js";

const router = Router();

router.get("/cats", async (_req, res) => {
  try {
    const cats = (await getAllCatches()).map(
      ({ id, lat, lng, color, breed, condition, createdAt }) => ({
        id,
        lat,
        lng,
        color,
        breed,
        condition,
        createdAt,
      })
    );
    res.json(cats);
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal memuat peta." });
  }
});

export default router;
