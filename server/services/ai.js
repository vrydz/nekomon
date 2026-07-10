import { GoogleGenAI, Type } from "@google/genai";

const FUR_COLORS = ["Oranye (Orange)", "Calico", "Tuxedo (Hitam-Putih)", "Tabby Abu", "Putih Bersih", "Hitam Legam"];
const BREEDS = ["Domestik / Kampung", "Anggora Campuran", "Persia Campuran", "Domestik Shorthair"];
const CONDITIONS = [
  "Terlihat sehat & gemuk",
  "Agak kurus, mungkin perlu makan",
  "Telinga ditakik (sudah disteril TNR)",
  "Bulu kusut tapi aktif",
];
const REJECT_LINES = [
  "Itu sepertinya tiang listrik. Cari kucing beneran, Hunter!",
  "Hmm, ini lebih mirip sandal jepit daripada kucing.",
  "AI kami yakin ini bukan kucing. Coba foto ulang!",
  "Objek tidak terdeteksi sebagai kucing. Misi gagal.",
];
const CARD_TIERS = {
  common: {
    label: "Common",
    subtitle: "Mudah Ditemukan",
    prompt:
      "A cute domestic orange tabby kitten playing with a ball of yarn in a cozy sunlit living room. Trading card game style, vibrant colors, clear borders, simple and clean background, anime illustration style, 8k resolution. --ar 2:3",
  },
  rare: {
    label: "Rare",
    subtitle: "Jarang",
    prompt:
      "An elegant black cat wearing a tiny sleek ninja outfit, standing on a rooftop under a full moon. Trading card game artwork, dynamic pose, subtle glowing yellow eyes, silver borders on the card, detailed anime fantasy style. --ar 2:3",
  },
  epic: {
    label: "Epic",
    subtitle: "Sangat Jarang",
    prompt:
      "A majestic and large Maine Coon cat infused with fire elements, its tail is made of bright flames, standing on a volcanic rock. Holographic trading card effect, epic fantasy anime style, glowing aura, intricate details, gold-accented borders. --ar 2:3",
  },
  legend: {
    label: "Legend",
    subtitle: "Legendaris",
    prompt:
      "An ancient, mystical Sphynx cat with glowing neon hieroglyph tattoos floating in a cosmic void surrounded by galaxies and clocks. Legendary trading card game design, masterpiece, ultra-detailed, dark fantasy anime style, ornate gold border, ethereal lighting. --ar 2:3",
  },
  ultimate: {
    label: "Ultimate",
    subtitle: "Tertinggi / Dewa",
    prompt:
      "A supreme god-like celestial cat entity made of pure stardust and dark matter, sitting on a throne of crystals in the center of the universe. Full-art trading card design, cosmic horror meets cute anime, breathtaking visuals, cinematic lighting, iridescent and rainbow metallic textures, 16k resolution. --ar 2:3",
  },
};

function pickRarity(confidence, rand = Math.random) {
  if (confidence >= 98 && rand() > 0.55) return "ultimate";
  if (confidence >= 96) return "legend";
  if (confidence >= 92) return "epic";
  if (confidence >= 86) return "rare";
  return "common";
}

function buildCardDetails(analysis, rand = Math.random) {
  const rarity = pickRarity(Number(analysis.confidence) || 0, rand);
  const tier = CARD_TIERS[rarity];
  const titleParts = {
    common: ["Yarn Paw", "Sunny Whisker", "Cozy Tabby"],
    rare: ["Moon Ninja", "Shadow Paw", "Rooftop Mew"],
    epic: ["Flame Tail", "Volcanic Mane", "Inferno Coon"],
    legend: ["Cosmic Sphinx", "Time Glyph", "Oracle Meow"],
    ultimate: ["Celestial Overlord", "Stardust Sovereign", "Crystal Nebula"],
  };
  const skillNames = {
    common: "Benang Ceria",
    rare: "Langkah Bulan",
    epic: "Ekor Api",
    legend: "Glyph Waktu",
    ultimate: "Takhta Kosmik",
  };
  const title = titleParts[rarity][Math.floor(rand() * titleParts[rarity].length)];
  const power = Math.min(9999, Math.round((Number(analysis.confidence) || 70) * (rarity === "ultimate" ? 96 : rarity === "legend" ? 52 : rarity === "epic" ? 28 : rarity === "rare" ? 15 : 8)));

  return {
    rarity,
    label: tier.label,
    subtitle: tier.subtitle,
    title,
    skill: skillNames[rarity],
    power,
    lore: `${analysis.breed || "Kucing misterius"} dengan bulu ${analysis.color || "unik"} ini terdeteksi ${analysis.condition || "penuh energi"}. Aura kartunya masuk kelas ${tier.label}.`,
    prompt: tier.prompt,
  };
}

function withCardDetails(result, rand) {
  if (!result?.isCat) return result;
  return {
    ...result,
    card: result.card?.rarity ? result.card : buildCardDetails(result, rand),
  };
}

function seededRandom(seedString) {
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) seed = (seed * 31 + seedString.charCodeAt(i)) >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function mockAnalyze(imageData) {
  const rand = seededRandom(imageData.slice(-200) + Date.now());
  const isCat = rand() > 0.18;
  if (!isCat) {
    return { isCat: false, message: REJECT_LINES[Math.floor(rand() * REJECT_LINES.length)] };
  }
  return {
    isCat: true,
    color: FUR_COLORS[Math.floor(rand() * FUR_COLORS.length)],
    breed: BREEDS[Math.floor(rand() * BREEDS.length)],
    condition: CONDITIONS[Math.floor(rand() * CONDITIONS.length)],
    confidence: Math.round(78 + rand() * 21),
  };
}

export async function analyzeWithOpenAI(imageData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY belum diset.");

  const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Kamu adalah analis kucing liar untuk game Stray Cat Hunter.
Balas HANYA JSON valid dengan schema:
{
  "isCat": boolean,
  "message": string (jika bukan kucing, pesan humor Bahasa Indonesia),
  "color": string (warna bulu, Bahasa Indonesia),
  "breed": string (perkiraan ras),
  "condition": string (kondisi fisik singkat),
  "confidence": number (0-100),
  "card": {
    "rarity": "common" | "rare" | "epic" | "legend" | "ultimate",
    "label": string,
    "subtitle": string,
    "title": string (nama kartu fantasi singkat),
    "skill": string (nama skill kartu Bahasa Indonesia),
    "power": number,
    "lore": string (1 kalimat Bahasa Indonesia berdasarkan foto),
    "prompt": string (prompt artwork sesuai rarity dari daftar yang diberikan developer)
  }
}`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analisis foto ini. Apakah ini kucing?" },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
          ],
        },
      ],
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  return withCardDetails(JSON.parse(content));
}

export async function analyzeWithGemini(imageData) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY belum diset.");

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const mimeType = imageData.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
  const base64 = imageData.replace(/^data:image\/\w+;base64,/, "");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
      {
        text: `Kamu adalah analis kucing liar untuk game Stray Cat Hunter.
Analisis foto ini. Apakah ini kucing?
Balas HANYA JSON valid dengan schema berikut (gunakan Bahasa Indonesia):
{
  "isCat": boolean,
  "message": string (jika bukan kucing, pesan humor Bahasa Indonesia),
  "color": string (warna bulu, Bahasa Indonesia),
  "breed": string (perkiraan ras),
  "condition": string (kondisi fisik singkat),
  "confidence": number (0-100)
}`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCat: { type: Type.BOOLEAN },
          message: { type: Type.STRING },
          color: { type: Type.STRING },
          breed: { type: Type.STRING },
          condition: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ["isCat"],
      },
    },
  });

  const jsonStr = response.text.trim();
  const parsed = JSON.parse(jsonStr);
  return withCardDetails(parsed);
}

export async function analyzeImage(imageData) {
  const provider = process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? "gemini" : "mock");
  if (provider === "gemini") return analyzeWithGemini(imageData);
  if (provider === "openai") return analyzeWithOpenAI(imageData);
  return withCardDetails(mockAnalyze(imageData), seededRandom(imageData.slice(0, 200)));
}
