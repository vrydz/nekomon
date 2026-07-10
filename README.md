# Stray Cat Hunter 🐱

Gamifikasi berburu kucing liar berbasis browser — foto langsung dari kamera, kunci GPS saat jepret, validasi Vision AI, poin, klasemen, dan peta interaktif.

## Fitur

| Fitur | Status |
|-------|--------|
| PWA (installable di HP) | ✅ |
| Kamera live (anti-galeri) | ✅ |
| GPS presisi + anti-spoofing | ✅ |
| Kompresi gambar client-side | ✅ |
| Vision AI (mock / OpenAI GPT-4o) | ✅ |
| +10 poin per tangkapan valid | ✅ |
| Leaderboard harian/mingguan/all-time | ✅ |
| Badges & achievements | ✅ |
| Peta Mapbox + clustering | ✅ |
| PostgreSQL + PostGIS | ✅ |
| Docker + Render deploy | ✅ |

## Stack

- **Frontend:** React 18 + Vite + PWA
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (+ PostGIS opsional) atau JSON file (dev)
- **AI:** Mock / OpenAI GPT-4o Vision
- **Peta:** Mapbox GL (runtime config via `/api/config`)

## Quick Start (Development)

```bash
npm install
cp .env.example .env   # opsional
npm run dev             # :5173 frontend + :3001 API
```

Tanpa `DATABASE_URL` → data disimpan di `server/data/store.json`.

## Quick Start (Production lokal)

```bash
npm run docker:up       # app :3001 + PostGIS :5432
```

## Deploy ke Cloud

Lihat **[docs/DEPLOY.md](docs/DEPLOY.md)** — panduan lengkap untuk:

- Docker Compose (VPS)
- Render.com (Blueprint `render.yaml`)
- Checklist Beta launch

```bash
# Ringkas: push GitHub → Render Blueprint → set MAPBOX_TOKEN
```

## Environment

| Variabel | Deskripsi |
|----------|-----------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MAPBOX_TOKEN` | Token Mapbox (runtime, disarankan produksi) |
| `VITE_MAPBOX_TOKEN` | Token Mapbox (build-time, dev) |
| `AI_PROVIDER` | `mock` atau `openai` |
| `OPENAI_API_KEY` | Wajib jika AI=openai |
| `REQUIRE_GPS` | `true` (default) — tolak upload tanpa GPS valid |
| `MAX_GPS_ACCURACY_M` | Max akurasi GPS meter (default: 150) |

## API

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/health` | Status + backend store |
| GET | `/api/config` | Config publik (Mapbox token) |
| POST | `/api/users` | Buat hunter |
| POST | `/api/analyze` | Vision AI |
| POST | `/api/catches` | Simpan tangkapan (+10 poin) |
| GET | `/api/leaderboard?period=` | Klasemen |
| GET | `/api/map/cats` | Titik kucing untuk peta |

## Produksi

```bash
npm run build
NODE_ENV=production DATABASE_URL=postgres://... npm start
```

## Lisensi

MIT
