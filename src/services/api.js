const USER_KEY = "sch_user_id";

function getHeaders() {
  const userId = localStorage.getItem(USER_KEY);
  return userId ? { "X-User-Id": userId } : {};
}

async function parseError(res, fallback) {
  const err = await res.json().catch(() => ({}));
  throw new Error(err.message || fallback);
}

function rememberUser(user) {
  localStorage.setItem(USER_KEY, user.id);
  return user;
}

export function clearSavedUser() {
  localStorage.removeItem(USER_KEY);
}

export async function fetchConfig() {
  const res = await fetch("/api/config");
  if (!res.ok) return { mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || "" };
  return res.json();
}

export async function getSavedUser() {
  const existing = localStorage.getItem(USER_KEY);
  if (!existing) return null;

  const res = await fetch(`/api/users/${existing}`);
  if (res.ok) return res.json();
  clearSavedUser();
  return null;
}

export async function registerUser({ email, username, password }) {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) await parseError(res, "Gagal membuat akun hunter.");
  return rememberUser(await res.json());
}

export async function loginUser({ username, password }) {
  const res = await fetch("/api/users/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) await parseError(res, "Gagal masuk.");
  return rememberUser(await res.json());
}

export async function forgotPassword({ email }) {
  const res = await fetch("/api/users/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) await parseError(res, "Gagal mengirim tautan reset password.");
  return res.json();
}

export async function analyzeCapture(imageData) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify({ imageData }),
  });
  if (!res.ok) await parseError(res, "Analisis AI gagal.");
  return res.json();
}

export async function submitCatch(payload) {
  const res = await fetch("/api/catches", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseError(res, "Gagal menyimpan tangkapan.");
  return res.json();
}

export async function evolveCatchType({ catchId, userId, element }) {
  const res = await fetch(`/api/catches/${catchId}/evolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify({ userId, element }),
  });
  if (!res.ok) await parseError(res, "Upgrade elemen gagal.");
  return res.json();
}

export async function fetchUserCatches(userId) {
  if (!userId) return [];
  const res = await fetch(`/api/catches/user/${userId}`, { headers: getHeaders() });
  if (!res.ok) await parseError(res, "Gagal memuat galeri.");
  return res.json();
}

export async function fetchLeaderboard(period = "all") {
  const res = await fetch(`/api/leaderboard?period=${period}`);
  if (!res.ok) await parseError(res, "Gagal memuat klasemen.");
  return res.json();
}

export async function fetchCatMap() {
  const res = await fetch("/api/map/cats");
  if (!res.ok) await parseError(res, "Gagal memuat peta.");
  return res.json();
}

export async function forgeNekomonCard({ catchId, userId, artStyle, element }) {
  const res = await fetch(`/api/catches/${catchId}/forge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getHeaders() },
    body: JSON.stringify({ userId, artStyle, element }),
  });
  if (!res.ok) await parseError(res, "Konversi kartu gagal.");
  return res.json();
}
