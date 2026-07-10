const MAX_ACCURACY_M = Number(process.env.MAX_GPS_ACCURACY_M || 150);
const REQUIRE_GPS = process.env.REQUIRE_GPS !== "false";

export function validateGps({ lat, lng, accuracy }) {
  if (lat == null || lng == null) {
    if (REQUIRE_GPS) {
      return { ok: false, message: "Lokasi GPS wajib. Aktifkan izin lokasi dan coba lagi." };
    }
    return { ok: true, warnings: ["GPS tidak tersedia — poin tetap disimpan tanpa koordinat."] };
  }

  if (typeof lat !== "number" || typeof lng !== "number" || Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, message: "Koordinat GPS tidak valid." };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, message: "Koordinat GPS di luar rentang yang wajar — kemungkinan lokasi palsu." };
  }

  if (lat === 0 && lng === 0) {
    return { ok: false, message: "Koordinat (0,0) ditolak — kemungkinan GPS palsu." };
  }

  if (accuracy != null) {
    if (typeof accuracy !== "number" || Number.isNaN(accuracy)) {
      return { ok: false, message: "Data akurasi GPS tidak valid." };
    }
    if (accuracy > MAX_ACCURACY_M) {
      return {
        ok: false,
        message: `Akurasi GPS terlalu rendah (±${Math.round(accuracy)}m). Dekat ke area terbuka dan coba lagi.`,
      };
    }
    if (accuracy <= 0) {
      return { ok: false, message: "Akurasi GPS mencurigakan — kemungkinan mock location." };
    }
  } else if (process.env.NODE_ENV === "production") {
    return { ok: false, message: "Perangkat tidak mengirim akurasi GPS. Nonaktifkan mock location." };
  }

  return { ok: true };
}
