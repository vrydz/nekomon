import { Router } from "express";
import { analyzeImage } from "../services/ai.js";

const router = Router();

router.post("/", async (req, res) => {
  const { imageData } = req.body;
  if (!imageData || !imageData.startsWith("data:image/")) {
    return res.status(400).json({ message: "imageData base64 wajib diisi." });
  }

  try {
    const result = await analyzeImage(imageData);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message || "Analisis gagal." });
  }
});

export default router;
