import { Router } from "express";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { createUser, findUserByName, findUserByEmail, getUser } from "../store/index.js";

const router = Router();
const STARTING_POINTS = 100;

function cleanUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function normalizeName(name) {
  return String(name || "").trim().replace(/\s+/g, " ").slice(0, 64);
}

function validateSignUp(email, username, password) {
  const normEmail = String(email || "").trim().toLowerCase();
  const normUser = normalizeName(username);

  if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
    return { message: "Format email tidak valid." };
  }

  const pwd = String(password || "");
  if (pwd.length < 8) {
    return { message: "Password minimal harus 8 karakter." };
  }
  if (!/[a-zA-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
    return { message: "Password wajib kombinasi angka dan huruf." };
  }

  if (normUser.length < 3) {
    return { message: "Username minimal 3 karakter." };
  }
  if (!/^[a-zA-Z0-9_. -]+$/.test(normUser)) {
    return { message: "Username hanya boleh berisi huruf, angka, spasi, titik, underscore, atau minus." };
  }

  return { email: normEmail, username: normUser };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const storedBuffer = Buffer.from(hash, "hex");
  const checkBuffer = scryptSync(password || "", salt, 64);
  return storedBuffer.length === checkBuffer.length && timingSafeEqual(storedBuffer, checkBuffer);
}

router.post("/", async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    const validation = validateSignUp(email, username, password);
    if (validation.message) return res.status(400).json({ message: validation.message });

    const existingEmail = await findUserByEmail(validation.email);
    if (existingEmail) return res.status(409).json({ message: "Email sudah terdaftar." });

    const existingName = await findUserByName(validation.username);
    if (existingName) return res.status(409).json({ message: "Username sudah dipakai." });

    const user = {
      id: uuidv4(),
      name: validation.username,
      email: validation.email,
      passwordHash: hashPassword(password),
      points: STARTING_POINTS,
      badges: [],
      createdAt: new Date().toISOString(),
    };
    const created = await createUser(user);
    res.status(201).json(cleanUser(created));
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal membuat user." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const normalized = String(username || "").trim();
    let user = null;
    if (normalized.includes("@")) {
      user = await findUserByEmail(normalized);
    } else {
      user = await findUserByName(normalizeName(normalized));
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Username/Email atau password salah." });
    }
    res.json(cleanUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal masuk." });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const normEmail = String(email || "").trim().toLowerCase();
    if (!normEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
      return res.status(400).json({ message: "Format email tidak valid." });
    }

    // Always succeed to mimic a safe reset-password request
    res.json({
      message: "Tautan reset password telah dikirim ke email kamu. Silakan cek kotak masuk atau folder spam."
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal memproses permintaan reset password." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan." });
    res.json(cleanUser(user));
  } catch (err) {
    res.status(500).json({ message: err.message || "Gagal memuat user." });
  }
});

export default router;
