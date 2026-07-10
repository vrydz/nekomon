# Panduan Deploy — Stray Cat Hunter

Aplikasi ini dirancang sebagai **single container**: Express serve API + static PWA, dengan PostgreSQL (PostGIS opsional).

## Opsi 1: Docker Compose (lokal / VPS)

Cara tercepat untuk menjalankan stack produksi lengkap di mesin Anda:

```bash
# Salin env (opsional)
cp .env.example .env

# Build & jalankan app + PostGIS
npm run docker:up
```

Buka **http://localhost:3001**

| Service | URL / Port |
|---------|------------|
| App + API | http://localhost:3001 |
| PostgreSQL | localhost:5432 (user/pass/db: `straycat`) |

Stop:

```bash
npm run docker:down
```

### Env Docker Compose

Set di file `.env` di root proyek:

```env
VITE_MAPBOX_TOKEN=pk.xxx          # dipakai saat docker build (opsional)
AI_PROVIDER=mock
OPENAI_API_KEY=sk-xxx
```

Token Mapbox juga bisa diset **runtime** lewat `MAPBOX_TOKEN` (tanpa rebuild) — frontend memuat dari `/api/config`.

---

## Opsi 2: Render.com (cloud gratis)

### Prasyarat

1. Akun [Render](https://render.com)
2. Repo GitHub berisi proyek ini
3. (Opsional) Token Mapbox & OpenAI

### Langkah deploy

1. **Push ke GitHub**

```bash
git init
git add .
git commit -m "Stray Cat Hunter MVP — production ready"
git branch -M main
git remote add origin https://github.com/USERNAME/stray-cat-hunter.git
git push -u origin main
```

2. **Blueprint deploy di Render**

   - Dashboard Render → **New** → **Blueprint**
   - Connect repo GitHub
   - Render membaca `render.yaml` dan membuat:
     - Web service (Docker)
     - PostgreSQL database

3. **Set environment variables** (Render Dashboard → Web Service → Environment)

| Key | Value | Wajib |
|-----|-------|-------|
| `MAPBOX_TOKEN` | `pk.xxx` | Opsional (peta interaktif) |
| `AI_PROVIDER` | `openai` atau `mock` | Opsional |
| `OPENAI_API_KEY` | `sk-xxx` | Jika AI=openai |
| `REQUIRE_GPS` | `true` | Disarankan produksi |
| `MAX_GPS_ACCURACY_M` | `150` | Opsional |

`DATABASE_URL` otomatis di-inject dari database Render.

4. **Deploy** — Render build Docker image & migrate DB otomatis saat startup.

5. **HTTPS** — Render menyediakan HTTPS gratis (`*.onrender.com`). Kamera & GPS akan berfungsi di HP.

### Health check

```
GET https://your-app.onrender.com/api/health
→ { "ok": true, "ai": "mock", "store": "postgres" }
```

---

## Opsi 3: VPS manual (tanpa Render)

```bash
# Di server Ubuntu
git clone <repo>
cd StrayCat_GO
cp .env.example .env
# Edit .env: DATABASE_URL, MAPBOX_TOKEN, dll.

docker compose up -d --build
```

Atau tanpa Docker:

```bash
npm ci
npm run build
DATABASE_URL=postgres://... NODE_ENV=production npm start
```

Gunakan **nginx** atau **Caddy** sebagai reverse proxy + SSL (Let's Encrypt).

---

## Database

- **Dev tanpa Docker:** kosongkan `DATABASE_URL` → pakai JSON file store
- **Produksi:** wajib `DATABASE_URL` PostgreSQL
- Migrasi otomatis saat startup (`server/db/init.sql`)
- PostGIS diaktifkan jika extension tersedia (Docker PostGIS image / Neon / Supabase)

Schema manual: `server/db/init.sql` atau `docs/postgis-schema.sql`

---

## Checklist Beta Launch

- [ ] HTTPS aktif (wajib untuk kamera di HP)
- [ ] `DATABASE_URL` terhubung (`/api/health` → `"store": "postgres"`)
- [ ] `MAPBOX_TOKEN` diset (peta interaktif)
- [ ] `AI_PROVIDER=openai` + API key (jika pakai Vision AI real)
- [ ] `REQUIRE_GPS=true` di produksi
- [ ] Test di HP: kamera → jepret → GPS → poin → peta
- [ ] Install PWA dari browser (Add to Home Screen)

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Kamera tidak jalan | Pastikan HTTPS, bukan iframe |
| GPS ditolak | Izin lokasi browser + matikan mock location |
| `"store": "json"` di produksi | Set `DATABASE_URL` |
| Peta skematis | Set `MAPBOX_TOKEN` di env server |
| Build Render gagal | Cek log Docker build; pastikan `package-lock.json` ada |
| PostGIS warning | Normal di host tanpa extension; lat/lng tetap tersimpan |
