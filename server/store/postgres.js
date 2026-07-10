import { getPool } from "../db/pool.js";

function rowToUser(row, { includePassword = false } = {}) {
  const user = {
    id: row.id,
    name: row.name,
    email: row.email || null,
    points: row.points,
    badges: row.badges || [],
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
  if (includePassword) user.passwordHash = row.password_hash;
  return user;
}

function rowToCatch(row) {
  return {
    id: row.id,
    userId: row.user_id,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy_m,
    color: row.fur_color,
    breed: row.breed,
    condition: row.condition_note,
    confidence: row.confidence,
    card: row.card_details || null,
    imageThumb: row.image_thumb,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

export async function getUser(id) {
  const { rows } = await getPool().query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ? rowToUser(rows[0]) : null;
}

export async function findUserByName(name) {
  const { rows } = await getPool().query("SELECT * FROM users WHERE LOWER(name) = LOWER($1)", [name]);
  return rows[0] ? rowToUser(rows[0], { includePassword: true }) : null;
}

export async function findUserByEmail(email) {
  if (!email) return null;
  const { rows } = await getPool().query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email]);
  return rows[0] ? rowToUser(rows[0], { includePassword: true }) : null;
}

export async function createUser(user) {
  const { rows } = await getPool().query(
    `INSERT INTO users (id, name, email, password_hash, points, badges, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [user.id, user.name, user.email || null, user.passwordHash || null, user.points, JSON.stringify(user.badges), user.createdAt]
  );
  return rowToUser(rows[0]);
}

export async function updateUser(id, patch) {
  const current = await getUser(id);
  if (!current) return null;

  const next = { ...current, ...patch };
  const { rows } = await getPool().query(
    `UPDATE users SET name = $2, email = $3, points = $4, badges = $5 WHERE id = $1 RETURNING *`,
    [id, next.name, next.email || null, next.points, JSON.stringify(next.badges)]
  );
  return rowToUser(rows[0]);
}

export async function addCatch(catchRecord) {
  const { rows } = await getPool().query(
    `INSERT INTO cat_catches
      (id, user_id, lat, lng, accuracy_m, fur_color, breed, condition_note, confidence, card_details, image_thumb, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      catchRecord.id,
      catchRecord.userId,
      catchRecord.lat,
      catchRecord.lng,
      catchRecord.accuracy,
      catchRecord.color,
      catchRecord.breed,
      catchRecord.condition,
      catchRecord.confidence,
      catchRecord.card ? JSON.stringify(catchRecord.card) : null,
      catchRecord.imageThumb,
      catchRecord.createdAt,
    ]
  );
  return rowToCatch(rows[0]);
}

export async function updateCatch(id, patch) {
  const currentRows = await getPool().query(`SELECT * FROM cat_catches WHERE id = $1`, [id]);
  if (!currentRows.rows[0]) return null;

  const current = rowToCatch(currentRows.rows[0]);
  const next = { ...current, ...patch };
  const { rows } = await getPool().query(
    `UPDATE cat_catches
     SET card_details = $2
     WHERE id = $1
     RETURNING *`,
    [id, next.card ? JSON.stringify(next.card) : null]
  );
  return rowToCatch(rows[0]);
}

export async function getAllCatches() {
  const { rows } = await getPool().query(
    `SELECT * FROM cat_catches WHERE lat IS NOT NULL AND lng IS NOT NULL ORDER BY created_at DESC`
  );
  return rows.map(rowToCatch);
}

export async function getUserCatches(userId) {
  const { rows } = await getPool().query(
    `SELECT * FROM cat_catches WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows.map(rowToCatch);
}

export async function getSeedLeaderboard() {
  const { rows } = await getPool().query(`SELECT name, points FROM seed_leaderboard ORDER BY points DESC`);
  return rows;
}

export async function getLeaderboard(period) {
  if (period === "all") {
    const { rows: seeds } = await getPool().query(`SELECT name, points FROM seed_leaderboard`);
    const { rows: users } = await getPool().query(`SELECT name, points FROM users ORDER BY points DESC`);

    const merged = new Map();
    for (const s of seeds) merged.set(s.name, s.points);
    for (const u of users) merged.set(u.name, Math.max(merged.get(u.name) || 0, u.points));

    return [...merged.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  }

  const since =
    period === "daily"
      ? "date_trunc('day', NOW())"
      : period === "weekly"
        ? "date_trunc('week', NOW())"
        : null;

  if (!since) return getLeaderboard("all");

  const { rows } = await getPool().query(
    `SELECT u.name, COUNT(c.id)::int * 10 AS points
     FROM cat_catches c
     JOIN users u ON u.id = c.user_id
     WHERE c.created_at >= ${since}
     GROUP BY u.id, u.name
     ORDER BY points DESC`
  );

  if (rows.length === 0) {
    const seeds = await getSeedLeaderboard();
    return seeds.slice(0, 3).map((s) => ({ name: s.name, points: Math.floor(s.points * 0.1) }));
  }

  return rows.map((r) => ({ name: r.name, points: Number(r.points) }));
}
