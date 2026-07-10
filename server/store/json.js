import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const DB_FILE = join(DATA_DIR, "store.json");

const DEFAULT = {
  users: {},
  catches: [],
  seedLeaderboard: [
    { name: "RinaKitty", points: 340 },
    { name: "BangAndi", points: 290 },
    { name: "MeongLover", points: 210 },
    { name: "PakRT07", points: 150 },
  ],
};

function ensureDb() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT, null, 2));
  }
}

function loadStore() {
  ensureDb();
  return JSON.parse(readFileSync(DB_FILE, "utf-8"));
}

function saveStore(data) {
  ensureDb();
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export async function getUser(id) {
  const store = loadStore();
  return store.users[id] || null;
}

export async function findUserByName(name) {
  const normalized = name.trim().toLowerCase();
  const users = Object.values(loadStore().users);
  return users.find((user) => user.name?.toLowerCase() === normalized) || null;
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const users = Object.values(loadStore().users);
  return users.find((user) => user.email?.toLowerCase() === normalized) || null;
}

export async function createUser(user) {
  const store = loadStore();
  store.users[user.id] = user;
  saveStore(store);
  return user;
}

export async function updateUser(id, patch) {
  const store = loadStore();
  if (!store.users[id]) return null;
  store.users[id] = { ...store.users[id], ...patch };
  saveStore(store);
  return store.users[id];
}

export async function addCatch(catchRecord) {
  const store = loadStore();
  store.catches.push(catchRecord);
  saveStore(store);
  return catchRecord;
}

export async function updateCatch(id, patch) {
  const store = loadStore();
  const index = store.catches.findIndex((c) => c.id === id);
  if (index < 0) return null;
  store.catches[index] = { ...store.catches[index], ...patch };
  saveStore(store);
  return store.catches[index];
}

export async function getAllCatches() {
  return loadStore().catches;
}

export async function getUserCatches(userId) {
  return loadStore().catches.filter((c) => c.userId === userId);
}

export async function getSeedLeaderboard() {
  return loadStore().seedLeaderboard;
}

export async function getLeaderboard(period) {
  const store = loadStore();
  const since = periodStart(period);

  const pointsByUser = {};
  for (const c of store.catches) {
    if (since && c.createdAt < since) continue;
    pointsByUser[c.userId] = (pointsByUser[c.userId] || 0) + 10;
  }

  const live = Object.entries(pointsByUser)
    .map(([userId, points]) => ({
      name: store.users[userId]?.name || "Anonim",
      points,
    }))
    .sort((a, b) => b.points - a.points);

  if (period === "all") {
    const merged = new Map();
    for (const s of store.seedLeaderboard) merged.set(s.name, s.points);
    for (const u of Object.values(store.users)) {
      merged.set(u.name, Math.max(merged.get(u.name) || 0, u.points));
    }
    return [...merged.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }

  if (live.length === 0) {
    return store.seedLeaderboard.slice(0, 3).map((s) => ({ ...s, points: Math.floor(s.points * 0.1) }));
  }

  return live;
}

function periodStart(period) {
  const now = new Date();
  if (period === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  }
  if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString();
  }
  return null;
}
