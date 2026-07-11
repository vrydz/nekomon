import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { addCatch, getUser, updateUser, getUserCatches, updateCatch } from "../store/index.js";
import { validateGps } from "../services/gps.js";
import { buildCardDetails, generateAnimeCardImage } from "../services/ai.js";

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
      card: null, // Mulai tanpa kartu (perlu di-forge dari Galeri Foto Asli)
      imageThumb: imageData, // original photo
      imageOriginal: imageData, // original photo
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

router.post("/:catchId/forge", async (req, res) => {
  try {
    const { userId, artStyle, element } = req.body || {};
    const elementKey = String(element || "").trim().toLowerCase();
    const styleKey = String(artStyle || "").trim().toLowerCase(); // "ghibli" or "mappa"

    if (!userId) return res.status(400).json({ message: "User wajib diisi." });
    if (!ELEMENT_TYPES[elementKey]) {
      return res.status(400).json({ message: "Elemen tidak valid. Pilih Fire, Ice, Earth, Wind, atau Thunder." });
    }
    if (styleKey !== "ghibli" && styleKey !== "mappa") {
      return res.status(400).json({ message: "Art Style tidak valid. Pilih ghibli atau mappa." });
    }

    const user = await getUser(userId);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
    if (Number(user.points) < 50) {
      return res.status(402).json({ message: "Point belum cukup. Konversi kartu membutuhkan 50 Point." });
    }

    const catches = await getUserCatches(userId);
    const catchRecord = catches.find((c) => c.id === req.params.catchId);
    if (!catchRecord) return res.status(404).json({ message: "Foto kucing tidak ditemukan." });
    if (catchRecord.card) {
      return res.status(409).json({ message: "Foto ini sudah dikonversi menjadi kartu Nekomon." });
    }

    // 1. Ambil Base Card Details
    const baseCard = buildCardDetails({
      color: catchRecord.color,
      breed: catchRecord.breed,
      condition: catchRecord.condition,
      confidence: catchRecord.confidence,
    });

    // 2. Tentukan Prompt Sesuai Gaya & Elemen
    const elementDescs = {
      fire: "blazing fire, swirling bright orange flames, and flying volcanic sparks",
      ice: "sharp floating ice crystals, freezing blue frost aura, and cold winter mist",
      earth: "glowing emerald rock armor, floating stone shards, and cracked ground energy",
      wind: "ethereal wind vortex, swirling green aero currents, and floating leaves",
      thunder: "crackling neon yellow lightning bolts, electric storm aura, and high-voltage sparks"
    };

    const ghibliTemplate = `Studio Ghibli anime style trading card game (TCG) illustration based on the provided reference photo of a cat. Transform the cat into a whimsical anime character with soft hand-drawn line art, warm cinematic lighting, and expressive, emotional glossy eyes. The character is infused with [PILIHAN ELEMEN] magic. Masterpiece, nostalgic anime aesthetic, lush watercolor textured background, official anime card artwork. --ar 2:3`;

    const mappaTemplate = `MAPPA Studio anime style trading card game (TCG) action illustration based on the provided reference photo of a cat. Transform the cat into a powerful and dynamic anime character with sharp detailed line art, intense cinematic shading, and fierce glowing eyes. The character is actively casting dramatic [PILIHAN ELEMEN] magic with particle effects flying around. High contrast, dark fantasy anime aesthetic, epic battle background. --ar 2:3`;

    const elementDesc = elementDescs[elementKey] || "";
    const template = styleKey === "ghibli" ? ghibliTemplate : mappaTemplate;
    const finalPrompt = template.replace("[PILIHAN ELEMEN]", elementDesc);

    // 3. Generate Gambar dengan Gemini
    // Gunakan imageOriginal atau imageThumb (keduanya sama-sama berisi foto asli saat ini)
    const originalImage = catchRecord.imageOriginal || catchRecord.imageThumb;
    const animeImageUrl = await generateAnimeCardImage(originalImage, finalPrompt);

    // 4. Buat detail kartu yang telah di-boost
    const elemObj = ELEMENT_TYPES[elementKey];
    const baseStats = baseBattleStats(catchRecord);

    const card = {
      ...baseCard,
      artStyle: styleKey,
      element: {
        key: elementKey,
        name: elemObj.name,
        label: elemObj.label,
        icon: elemObj.icon,
        prompt: finalPrompt,
      },
      battleStats: {
        attack: baseStats.attack + elemObj.statBoost.attack,
        defense: baseStats.defense + elemObj.statBoost.defense,
        speed: baseStats.speed + elemObj.statBoost.speed,
      },
      power: (Number(baseCard.power) || Number(catchRecord.confidence) * 10) + elemObj.statBoost.attack * 8 + elemObj.statBoost.defense * 6 + elemObj.statBoost.speed * 7,
      lore: `Berhasil ditempa dengan Gaya ${styleKey === "ghibli" ? "Studio Ghibli" : "MAPPA Studio"} dan menguasai elemen ${elemObj.name}!`,
      imageAnime: animeImageUrl,
    };

    const updatedCatch = await updateCatch(catchRecord.id, {
      card,
      imageThumb: animeImageUrl, // Disimpan ke imageThumb agar langsung dirender di Gallery
      imageOriginal: originalImage, // Tetap mempertahankan foto asli kucing
    });

    const updatedUser = await updateUser(userId, { points: Number(user.points) - 50 });

    res.json({
      points: updatedUser.points,
      catch_: updatedCatch,
      message: `Konversi Berhasil! Nekomon kamu berhasil ditempa menjadi kartu beranimasi elemen ${elemObj.name}!`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Proses konversi gagal." });
  }
});

export default router;
