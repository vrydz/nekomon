import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { addCatch, getUser, updateUser, getUserCatches, updateCatch } from "../store/index.js";
import { validateGps } from "../services/gps.js";

const router = Router();
const POINTS_PER_CATCH = 10;
const TYPE_UPGRADE_COST = 50;
const ELEMENT_TYPES = {
  fire: {
    name: "Fire",
    label: "Fire Type",
    icon: "flame",
    statBoost: { attack: 34, defense: 8, speed: 14 },
    prompt:
      "An anime-style trading card game (TCG) illustration based on the provided reference photo of a [Warna/Ras Kucing]. Transform the cat into a fierce anime character with glowing paws, surrounded by stylized anime fire bursts and swirling orange flames. Volcanic embers background, dynamic lighting. Masterpiece, high quality, official digital card game artwork style. --ar 2:3",
  },
  ice: {
    name: "Ice",
    label: "Ice Type",
    icon: "snowflake",
    statBoost: { attack: 18, defense: 32, speed: 8 },
    prompt:
      "An anime-style trading card game (TCG) illustration based on the provided reference photo of a [Warna/Ras Kucing]. Transform the cat into a majestic anime character with frosted fur and glowing blue eyes, surrounded by sharp floating ice crystals and a cold blizzard mist. Frozen tundra background. Masterpiece, high quality, official digital card game artwork style. --ar 2:3",
  },
  earth: {
    name: "Earth",
    label: "Earth Type",
    icon: "mountain",
    statBoost: { attack: 20, defense: 38, speed: 4 },
    prompt:
      "An anime-style trading card game (TCG) illustration based on the provided reference photo of a [Warna/Ras Kucing]. Transform the cat into a sturdy anime character wearing lightweight crystal armor, surrounded by floating rocks and green emerald energy shards. Mountain peak background. Masterpiece, high quality, official digital card game artwork style. --ar 2:3",
  },
  wind: {
    name: "Wind",
    label: "Wind Type",
    icon: "wind",
    statBoost: { attack: 16, defense: 10, speed: 38 },
    prompt:
      "An anime-style trading card game (TCG) illustration based on the provided reference photo of a [Warna/Ras Kucing]. Transform the cat into a sleek anime character with ethereal wind wings, surrounded by swirling gale currents and floating green leaves. High sky and clouds background. Masterpiece, high quality, official digital card game artwork style. --ar 2:3",
  },
  thunder: {
    name: "Thunder",
    label: "Thunder Type",
    icon: "zap",
    statBoost: { attack: 30, defense: 10, speed: 28 },
    prompt:
      "An anime-style trading card game (TCG) illustration based on the provided reference photo of a [Warna/Ras Kucing]. Transform the cat into a powerful anime character with electric sparks dancing on its fur, surrounded by jagged neon yellow lightning bolts. Dark stormy sky background, high contrast. Masterpiece, high quality, official digital card game artwork style. --ar 2:3",
  },
};

function computeBadges(_userId, catches, existingBadges = []) {
  const badges = new Set(existingBadges);
  if (catches.length >= 1) badges.add("Hunter Pertama");
  const orangeCount = catches.filter((c) => c.color?.includes("Oranye")).length;
  if (orangeCount >= 5) badges.add("Orange Conqueror");
  if (catches.length >= 10) badges.add("Cat Master x10");
  if (catches.length >= 50) badges.add("Legendary Hunter");
  return [...badges];
}

function baseBattleStats(catchRecord) {
  const confidence = Number(catchRecord.confidence) || 75;
  const power = Number(catchRecord.card?.power) || confidence * 10;
  return {
    attack: Math.round(power / 18 + confidence / 3),
    defense: Math.round(power / 24 + confidence / 4),
    speed: Math.round(power / 28 + confidence / 5),
  };
}

function evolveCard(catchRecord, elementKey) {
  const element = ELEMENT_TYPES[elementKey];
  const base = catchRecord.card || {};
  const stats = base.battleStats || baseBattleStats(catchRecord);

  const catDesc = `${catchRecord.color || "kucing"} ${catchRecord.breed || ""}`.trim();
  const dynamicPrompt = element.prompt.replace("[Warna/Ras Kucing]", catDesc || "kucing");

  return {
    ...base,
    element: {
      key: elementKey,
      name: element.name,
      label: element.label,
      icon: element.icon,
      prompt: dynamicPrompt,
    },
    battleStats: {
      attack: stats.attack + element.statBoost.attack,
      defense: stats.defense + element.statBoost.defense,
      speed: stats.speed + element.statBoost.speed,
    },
    power: (Number(base.power) || Number(catchRecord.confidence) * 10) + element.statBoost.attack * 8 + element.statBoost.defense * 6 + element.statBoost.speed * 7,
    lore: `Upgrade Berhasil! Nekomon kamu kini menguasai elemen ${element.name} dan siap bertarung!`,
    elementPrompt: dynamicPrompt,
  };
}

router.get("/user/:userId", async (req, res) => {
  try {
    const user = await getUser(req.params.userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
    const catches = await getUserCatches(req.params.userId);
    res.json(catches);
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal memuat galeri." });
  }
});

router.post("/:catchId/evolve", async (req, res) => {
  try {
    const { userId, element } = req.body || {};
    const elementKey = String(element || "").trim().toLowerCase();
    if (!userId) return res.status(400).json({ message: "User wajib diisi." });
    if (!ELEMENT_TYPES[elementKey]) {
      return res.status(400).json({ message: "Elemen tidak valid. Pilih Fire, Ice, Earth, Wind, atau Thunder." });
    }

    const user = await getUser(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
    if (Number(user.points) < TYPE_UPGRADE_COST) {
      return res.status(402).json({ message: "Point belum cukup. Upgrade elemen membutuhkan 50 Point." });
    }

    const catches = await getUserCatches(userId);
    const catchRecord = catches.find((c) => c.id === req.params.catchId);
    if (!catchRecord) return res.status(404).json({ message: "Kartu Nekomon tidak ditemukan." });
    if (catchRecord.card?.element) {
      return res.status(409).json({ message: "Kartu ini sudah memiliki elemen." });
    }

    const card = evolveCard(catchRecord, elementKey);
    const updatedCatch = await updateCatch(catchRecord.id, { card });
    const updatedUser = await updateUser(userId, { points: Number(user.points) - TYPE_UPGRADE_COST });

    res.json({
      points: updatedUser.points,
      catch_: updatedCatch,
      message: `Upgrade Berhasil! Nekomon kamu kini menguasai elemen ${ELEMENT_TYPES[elementKey].name} dan siap bertarung!`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Upgrade elemen gagal." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { userId, imageData, lat, lng, accuracy, analysis } = req.body;

    if (!userId || !analysis?.isCat) {
      return res.status(400).json({ message: "Tangkapan tidak valid." });
    }
    if (!imageData?.startsWith?.("data:image/")) {
      return res.status(400).json({ message: "Foto tangkapan wajib diisi." });
    }

    const gps = validateGps({ lat, lng, accuracy });
    if (!gps.ok) {
      return res.status(422).json({ message: gps.message });
    }

    const user = await getUser(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });

    const catch_ = {
      id: uuidv4(),
      userId,
      lat: lat ?? null,
      lng: lng ?? null,
      accuracy: accuracy ?? null,
      color: analysis.color,
      breed: analysis.breed,
      condition: analysis.condition,
      confidence: analysis.confidence,
      card: analysis.card || null,
      imageThumb: imageData,
      createdAt: new Date().toISOString(),
    };

    await addCatch(catch_);

    const newPoints = user.points + POINTS_PER_CATCH;
    const userCatches = await getUserCatches(userId);
    const badges = computeBadges(userId, userCatches, user.badges);
    const updated = await updateUser(userId, { points: newPoints, badges });

    res.status(201).json({
      points: updated.points,
      badges: updated.badges,
      catch_,
      warnings: gps.warnings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal menyimpan tangkapan." });
  }
});

export default router;
