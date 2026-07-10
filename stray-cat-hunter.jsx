import React, { useState, useRef, useCallback, useEffect } from "react";
import { Camera, MapPin, Trophy, Award, X, Check, AlertTriangle, Cat, Crosshair } from "lucide-react";

// ---------- Mock "AI" cat analyzer ----------
// In production this calls a real Vision AI endpoint (Cloud Vision / GPT-4o / YOLOv8).
// Here we simulate it deterministically-ish so the demo flow is fully testable.
const FUR_COLORS = ["Oranye (Orange)", "Calico", "Tuxedo (Hitam-Putih)", "Tabby Abu", "Putih Bersih", "Hitam Legam"];
const BREEDS = ["Domestik / Kampung", "Anggora Campuran", "Persia Campuran", "Domestik Shorthair"];
const CONDITIONS = ["Terlihat sehat & gemuk", "Agak kurus, mungkin perlu makan", "Telinga ditakik (sudah disteril TNR)", "Bulu kusut tapi aktif"];
const REJECT_LINES = [
  "Itu sepertinya tiang listrik. Cari kucing beneran, Hunter!",
  "Hmm, ini lebih mirip sandal jepit daripada kucing.",
  "AI kami yakin ini bukan kucing. Coba foto ulang!",
  "Objek tidak terdeteksi sebagai kucing. Misi gagal.",
];

function mockAnalyze(seedString) {
  // deterministic pseudo-random from a seed so re-renders are stable per capture
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) seed = (seed * 31 + seedString.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const isCat = rand() > 0.18; // ~82% pass rate so demo isn't all-success
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

const HUNTER_NAME = "Kamu";
const SEED_LEADERBOARD = [
  { name: "RinaKitty", points: 340 },
  { name: "BangAndi", points: 290 },
  { name: "MeongLover", points: 210 },
  { name: "PakRT07", points: 150 },
];

export default function StrayCatHunter() {
  const [screen, setScreen] = useState("home"); // home | hunt | result | map | board
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [captured, setCaptured] = useState(null); // {dataUrl, lat, lng, accuracy}
  const [analysis, setAnalysis] = useState(null);
  const [points, setPoints] = useState(0);
  const [catLog, setCatLog] = useState([]); // confirmed catches
  const [badges, setBadges] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const leaderboard = [...SEED_LEADERBOARD, { name: HUNTER_NAME, points }].sort((a, b) => b.points - a.points);

  const startCamera = useCallback(async () => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "Browser ini tidak mendukung akses kamera (atau halaman tidak dibuka lewat HTTPS). Coba buka di Chrome/Safari langsung, bukan di dalam pratinjau/iframe."
      );
      return;
    }

    try {
      // Memanggil getUserMedia langsung di handler klik adalah yang memicu pop-up izin browser.
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(s);
      setScreen("hunt");
    } catch (e) {
      if (e.name === "NotAllowedError") {
        setError(
          "Izin kamera ditolak. Buka setting browser → Izin Situs → Kamera, lalu pilih 'Izinkan' untuk halaman ini, dan coba lagi."
        );
      } else if (e.name === "NotFoundError") {
        setError("Tidak ditemukan kamera di perangkat ini.");
      } else if (e.name === "NotReadableError") {
        setError("Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.");
      } else if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost"
      ) {
        setError("Akses kamera butuh koneksi HTTPS. Halaman ini belum HTTPS.");
      } else {
        setError("Tidak bisa mengakses kamera: " + (e.message || "kesalahan tidak diketahui."));
      }
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, screen]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
  };

  const shutter = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

    if (!navigator.geolocation) {
      finalizeCapture(dataUrl, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        finalizeCapture(dataUrl, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => finalizeCapture(dataUrl, null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const finalizeCapture = (dataUrl, geo) => {
    stopCamera();
    setCaptured({ dataUrl, ...geo });
    setScreen("result");
    setAnalyzing(true);
    setTimeout(() => {
      const result = mockAnalyze(dataUrl.slice(-200) + Date.now());
      setAnalysis(result);
      setAnalyzing(false);
      if (result.isCat) {
        setPoints((p) => p + 10);
        setCatLog((log) => {
          const next = [
            ...log,
            { ...result, lat: geo?.lat, lng: geo?.lng, time: new Date().toLocaleTimeString() },
          ];
          if (result.color.includes("Oranye") && next.filter((c) => c.color.includes("Oranye")).length === 1) {
            setBadges((b) => (b.includes("Orange Conqueror") ? b : [...b, "Orange Conqueror"]));
          }
          if (next.length === 1) setBadges((b) => (b.includes("Hunter Pertama") ? b : [...b, "Hunter Pertama"]));
          return next;
        });
      }
    }, 1400);
  };

  const reset = () => {
    setCaptured(null);
    setAnalysis(null);
    setScreen("home");
  };

  return (
    <div style={styles.app}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {screen === "home" && (
        <HomeScreen
          points={points}
          catCount={catLog.length}
          badges={badges}
          error={error}
          onHunt={startCamera}
          onMap={() => setScreen("map")}
          onBoard={() => setScreen("board")}
        />
      )}

      {screen === "hunt" && (
        <HuntScreen
          videoRef={videoRef}
          onShutter={shutter}
          onCancel={() => {
            stopCamera();
            setScreen("home");
          }}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          captured={captured}
          analyzing={analyzing}
          analysis={analysis}
          onDone={reset}
          onRetry={() => {
            setCaptured(null);
            setAnalysis(null);
            startCamera();
          }}
        />
      )}

      {screen === "map" && <MapScreen catLog={catLog} onBack={() => setScreen("home")} />}

      {screen === "board" && <BoardScreen leaderboard={leaderboard} onBack={() => setScreen("home")} />}
    </div>
  );
}

function HomeScreen({ points, catCount, badges, error, onHunt, onMap, onBoard }) {
  return (
    <div style={styles.screen}>
      <div style={styles.headerBar}>
        <div style={styles.logoRow}>
          <Cat size={26} color="#FF7A33" />
          <span style={styles.logoText}>Stray Cat Hunter</span>
        </div>
      </div>

      <div style={styles.statCard}>
        <div>
          <div style={styles.statLabel}>Poin Kamu</div>
          <div style={styles.statValue}>{points}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={styles.statLabel}>Kucing Tertangkap</div>
          <div style={styles.statValueSmall}>{catCount} 🐾</div>
        </div>
      </div>

      {badges.length > 0 && (
        <div style={styles.badgeRow}>
          {badges.map((b) => (
            <div key={b} style={styles.badgePill}>
              <Award size={14} /> {b}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={styles.errorBox}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <button style={styles.huntButton} onClick={onHunt}>
        <Camera size={22} />
        Mulai Berburu
      </button>

      <div style={styles.row}>
        <button style={styles.secondaryButton} onClick={onMap}>
          <MapPin size={18} /> Peta
        </button>
        <button style={styles.secondaryButton} onClick={onBoard}>
          <Trophy size={18} /> Klasemen
        </button>
      </div>

      <p style={styles.footnote}>
        Foto langsung dari kamera & lokasi GPS dikunci otomatis saat jepret — anti-spoofing, tidak bisa unggah dari galeri.
      </p>
    </div>
  );
}

function HuntScreen({ videoRef, onShutter, onCancel }) {
  return (
    <div style={styles.cameraScreen}>
      <video ref={videoRef} autoPlay playsInline muted style={styles.video} />
      <div style={styles.cameraOverlayTop}>
        <button style={styles.iconButtonGhost} onClick={onCancel}>
          <X size={22} color="#fff" />
        </button>
        <div style={styles.huntTag}>
          <Crosshair size={14} /> Cari kucing liar...
        </div>
      </div>
      <div style={styles.cameraOverlayBottom}>
        <button style={styles.shutterButton} onClick={onShutter} aria-label="Jepret">
          <span style={styles.shutterInner} />
        </button>
      </div>
    </div>
  );
}

function ResultScreen({ captured, analyzing, analysis, onDone, onRetry }) {
  return (
    <div style={styles.screen}>
      <div style={styles.resultImageWrap}>
        {captured?.dataUrl && <img src={captured.dataUrl} alt="capture" style={styles.resultImage} />}
        {captured?.lat != null && (
          <div style={styles.gpsTag}>
            <MapPin size={12} /> {captured.lat.toFixed(5)}, {captured.lng.toFixed(5)}
          </div>
        )}
      </div>

      {analyzing && (
        <div style={styles.analyzingBox}>
          <div style={styles.spinner} />
          <span>Menganalisis dengan Vision AI...</span>
        </div>
      )}

      {!analyzing && analysis && analysis.isCat && (
        <div style={styles.successBox}>
          <div style={styles.successHeader}>
            <Check size={20} color="#1F7A4D" />
            <span style={styles.successTitle}>Kucing Terverifikasi! +10 Poin</span>
          </div>
          <DetailRow label="Warna bulu" value={analysis.color} />
          <DetailRow label="Perkiraan ras" value={analysis.breed} />
          <DetailRow label="Kondisi" value={analysis.condition} />
          <DetailRow label="Keyakinan AI" value={`${analysis.confidence}%`} />
          <button style={styles.huntButton} onClick={onDone}>
            Lanjut Berburu
          </button>
        </div>
      )}

      {!analyzing && analysis && !analysis.isCat && (
        <div style={styles.failBox}>
          <AlertTriangle size={20} color="#B8430B" />
          <span style={styles.failText}>{analysis.message}</span>
          <button style={styles.huntButton} onClick={onRetry}>
            Coba Lagi
          </button>
          <button style={styles.linkButton} onClick={onDone}>
            Kembali ke Beranda
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function MapScreen({ catLog, onBack }) {
  const located = catLog.filter((c) => c.lat != null);
  // simple normalized scatter, no external map tiles (no API key in this prototype)
  const lats = located.map((c) => c.lat);
  const lngs = located.map((c) => c.lng);
  const minLat = Math.min(...lats, -1), maxLat = Math.max(...lats, 1);
  const minLng = Math.min(...lngs, -1), maxLng = Math.max(...lngs, 1);

  return (
    <div style={styles.screen}>
      <ScreenHeader title="Peta Kucing Liar" onBack={onBack} />
      {located.length === 0 ? (
        <p style={styles.emptyText}>Belum ada titik kucing tersimpan. Mulai berburu untuk mengisi peta!</p>
      ) : (
        <div style={styles.mapBox}>
          {located.map((c, i) => {
            const x = ((c.lng - minLng) / (maxLng - minLng || 1)) * 90 + 5;
            const y = 90 - ((c.lat - minLat) / (maxLat - minLat || 1)) * 90;
            return (
              <div key={i} style={{ ...styles.mapPin, left: `${x}%`, top: `${y}%` }} title={c.color}>
                <MapPin size={20} color="#FF7A33" fill="#FF7A33" />
              </div>
            );
          })}
        </div>
      )}
      <p style={styles.footnote}>
        Peta skematik (prototipe). Versi produksi akan memakai tile Mapbox/Google Maps + PostGIS dengan clustering.
      </p>
    </div>
  );
}

function BoardScreen({ leaderboard, onBack }) {
  return (
    <div style={styles.screen}>
      <ScreenHeader title="Klasemen Hunter" onBack={onBack} />
      <div style={styles.boardList}>
        {leaderboard.map((h, i) => (
          <div key={h.name} style={{ ...styles.boardRow, ...(h.name === "Kamu" ? styles.boardRowSelf : {}) }}>
            <span style={styles.boardRank}>{i + 1}</span>
            <span style={styles.boardName}>{h.name}</span>
            <span style={styles.boardPoints}>{h.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenHeader({ title, onBack }) {
  return (
    <div style={styles.subHeader}>
      <button style={styles.linkButton} onClick={onBack}>
        ← Kembali
      </button>
      <span style={styles.subHeaderTitle}>{title}</span>
    </div>
  );
}

const styles = {
  app: {
    fontFamily: "'Inter', system-ui, sans-serif",
    background: "#FFF8F0",
    minHeight: "100vh",
    maxWidth: 420,
    margin: "0 auto",
    color: "#2B2118",
  },
  screen: { padding: "20px 18px 32px", display: "flex", flexDirection: "column", gap: 14 },
  headerBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  logoRow: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontWeight: 800, fontSize: 19, letterSpacing: -0.3 },
  statCard: {
    background: "#2B2118",
    color: "#FFF8F0",
    borderRadius: 16,
    padding: "16px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: { fontSize: 11, opacity: 0.65, textTransform: "uppercase", letterSpacing: 0.5 },
  statValue: { fontSize: 30, fontWeight: 800, color: "#FF7A33" },
  statValueSmall: { fontSize: 18, fontWeight: 700 },
  badgeRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  badgePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#FFE6D2",
    color: "#B8430B",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 10px",
    borderRadius: 20,
  },
  errorBox: {
    background: "#FFE9E0",
    color: "#B8430B",
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  huntButton: {
    background: "#FF7A33",
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "16px 0",
    fontSize: 16,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    cursor: "pointer",
    marginTop: 6,
  },
  row: { display: "flex", gap: 10 },
  secondaryButton: {
    flex: 1,
    background: "#fff",
    border: "1.5px solid #E8DCC8",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    color: "#2B2118",
  },
  footnote: { fontSize: 11.5, color: "#8A7A66", lineHeight: 1.5, marginTop: 4 },

  cameraScreen: { position: "relative", height: "100vh", background: "#000", overflow: "hidden" },
  video: { width: "100%", height: "100%", objectFit: "cover" },
  cameraOverlayTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButtonGhost: {
    background: "rgba(0,0,0,0.45)",
    border: "none",
    borderRadius: "50%",
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  huntTag: {
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    fontSize: 12,
    padding: "6px 12px",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  cameraOverlayBottom: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
  },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "4px solid #fff",
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  shutterInner: { width: 56, height: 56, borderRadius: "50%", background: "#FF7A33" },

  resultImageWrap: { position: "relative", borderRadius: 16, overflow: "hidden" },
  resultImage: { width: "100%", display: "block" },
  gpsTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 11,
    padding: "4px 8px",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  analyzingBox: { display: "flex", alignItems: "center", gap: 10, justifyContent: "center", padding: 20, fontSize: 14, color: "#8A7A66" },
  spinner: {
    width: 18,
    height: 18,
    border: "3px solid #E8DCC8",
    borderTopColor: "#FF7A33",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  successBox: { background: "#F0F8F2", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 10 },
  successHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  successTitle: { fontWeight: 700, color: "#1F7A4D" },
  failBox: { background: "#FFF1E8", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center" },
  failText: { fontSize: 14, color: "#B8430B", fontWeight: 600 },
  detailRow: { display: "flex", justifyContent: "space-between", fontSize: 13.5, borderBottom: "1px solid #E2EDE5", paddingBottom: 6 },
  detailLabel: { color: "#5E7066" },
  detailValue: { fontWeight: 600 },
  linkButton: { background: "none", border: "none", color: "#8A7A66", fontSize: 13, cursor: "pointer", textDecoration: "underline" },

  subHeader: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  subHeaderTitle: { fontWeight: 700, fontSize: 17 },
  emptyText: { color: "#8A7A66", fontSize: 14 },
  mapBox: {
    position: "relative",
    height: 360,
    background: "#EFE6D6",
    borderRadius: 16,
    border: "1.5px solid #E0D2B8",
    backgroundImage:
      "linear-gradient(#E0D2B8 1px, transparent 1px), linear-gradient(90deg, #E0D2B8 1px, transparent 1px)",
    backgroundSize: "24px 24px",
  },
  mapPin: { position: "absolute", transform: "translate(-50%, -100%)" },

  boardList: { display: "flex", flexDirection: "column", gap: 8 },
  boardRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    border: "1.5px solid #E8DCC8",
    borderRadius: 12,
    padding: "12px 14px",
  },
  boardRowSelf: { background: "#FFF1E8", border: "1.5px solid #FF7A33" },
  boardRank: { fontWeight: 800, color: "#8A7A66", width: 20 },
  boardName: { flex: 1, fontWeight: 600 },
  boardPoints: { fontWeight: 700, color: "#FF7A33" },
};
