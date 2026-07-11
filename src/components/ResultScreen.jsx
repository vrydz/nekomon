import { useState, useEffect, useRef } from "react";
import { MapPin, Check, AlertTriangle, Sparkles, Wand2, Zap, Flame, Snowflake, Mountain, Wind as WindIcon, CheckCircle } from "lucide-react";

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

const rarityFallback = {
  common: { label: "Common", subtitle: "Mudah Ditemukan" },
  rare: { label: "Rare", subtitle: "Jarang" },
  epic: { label: "Epic", subtitle: "Sangat Jarang" },
  legend: { label: "Legend", subtitle: "Legendaris" },
  ultimate: { label: "Ultimate", subtitle: "Tertinggi / Dewa" },
};

const elementOptions = [
  { key: "fire", name: "Fire", icon: Flame },
  { key: "ice", name: "Ice", icon: Snowflake },
  { key: "earth", name: "Earth", icon: Mountain },
  { key: "wind", name: "Wind", icon: WindIcon },
  { key: "thunder", name: "Thunder", icon: Zap },
];

const elementVideos = {
  fire: "fire_sparkles_loop.mp4",
  ice: "frost_glimmer_loop.mp4",
  earth: "crystal_glow_loop.mp4",
  wind: "breeze_swirl_loop.mp4",
  thunder: "lightning_crackle_loop.mp4",
};

function ElementIcon({ element, size = 16 }) {
  const found = elementOptions.find((item) => item.key === element?.key || item.name === element?.name);
  const Icon = found?.icon || Sparkles;
  return <Icon size={size} />;
}

export function CaptureCard({ captured, analysis }) {
  const rarity = analysis.card?.rarity || "common";
  const fallback = rarityFallback[rarity] || rarityFallback.common;
  const card = { ...fallback, ...analysis.card };
  const elementKey = card.element?.key || "neutral";

  return (
    <section className={`capture-card capture-card-${rarity} capture-card-element-${elementKey}`} aria-label={`Kartu ${card.label}`}>
      <div className="capture-card-shine" />
      <div className="capture-card-top">
        <div>
          <div className="capture-card-title text-left">{card.title || "Stray Cat Hunter"}</div>
          <div className="capture-card-subtitle text-left">{analysis.breed || "Kucing misterius"}</div>
        </div>
        <div className="rarity-chip">
          <Sparkles size={14} />
          <span>{card.label}</span>
        </div>
      </div>

      <div className="capture-card-art relative overflow-hidden">
        {captured?.dataUrl && (
          <img
            src={captured.dataUrl}
            alt="Artwork kartu kucing"
            className={`capture-card-image ${card.element ? "anime-card-image" : ""}`}
          />
        )}
        <div className="capture-card-aura" />
        
        {card.element && (
          <div className="element-emblem z-20" title={card.element.label}>
            <ElementIcon element={card.element} size={24} />
          </div>
        )}

        {/* Dynamic VFX Overlay (Feature 2) */}
        {card.element && (
          <div className={`vfx-overlay vfx-overlay-${elementKey}`}>
            <div className="vfx-particles" />
            <video
              src={`/${elementVideos[elementKey] || ""}`}
              autoPlay
              loop
              muted
              playsInline
              className="vfx-video-element"
              onError={(e) => {
                // If MP4 asset is not physically present, let the beautiful CSS GPU particles act as fallback
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
      </div>

      <div className="capture-card-info">
        <div className="card-type-row text-xs">
          <span>{card.subtitle}</span>
          <span>{analysis.confidence}% AI</span>
        </div>
        <div className="card-skill-row">
          <div className="card-skill">
            {card.element ? <ElementIcon element={card.element} size={15} /> : <Wand2 size={15} />}
            <span>{card.skill || "Aura Meong"}</span>
          </div>
          <div className="card-power">
            <Zap size={14} />
            <span>{card.power || analysis.confidence * 10}</span>
          </div>
        </div>
        {card.element && (
          <div className="battle-stats">
            <span>ATK {card.battleStats?.attack}</span>
            <span>DEF {card.battleStats?.defense}</span>
            <span>SPD {card.battleStats?.speed}</span>
          </div>
        )}
        <p className="card-lore text-left">{card.lore || "Kucing ini berubah menjadi kartu koleksi penuh energi ceria."}</p>
      </div>

      {card.prompt && (
        <details className="card-prompt-box">
          <summary>Prompt style kartu</summary>
          <p className="text-left">{card.prompt}</p>
        </details>
      )}
    </section>
  );
}

export default function ResultScreen({
  captured,
  analyzing,
  analysis,
  catchRecord,
  userPoints,
  evolving,
  evolveMessage,
  onEvolve,
  onDone,
  onRetry,
  onViewGallery,
}) {
  const selectedElement = analysis?.card?.element;
  const canEvolve = Boolean(analysis?.isCat && catchRecord?.id && !selectedElement && userPoints >= 50);

  // Evolve success celebration and auto-save state
  const [celebrating, setCelebrating] = useState(false);
  const [savingToast, setSavingToast] = useState("");
  const lastEvolving = useRef(false);

  useEffect(() => {
    if (lastEvolving.current && !evolving && analysis?.card?.element) {
      // Evolution completed successfully! Trigger full celebration screen & auto download
      setCelebrating(true);
      triggerAutoSave();
    }
    lastEvolving.current = evolving;
  }, [evolving, analysis]);

  // High Resolution PNG Card Exporter (Feature 3 - Auto Save)
  const triggerAutoSave = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw custom card background based on element
      const gradient = ctx.createLinearGradient(0, 0, 0, 800);
      const elementKey = analysis?.card?.element?.key || "neutral";
      if (elementKey === "fire") {
        gradient.addColorStop(0, "#450a0a");
        gradient.addColorStop(0.5, "#dc2626");
        gradient.addColorStop(1, "#f97316");
      } else if (elementKey === "ice") {
        gradient.addColorStop(0, "#0f2f66");
        gradient.addColorStop(0.5, "#2563eb");
        gradient.addColorStop(1, "#93c5fd");
      } else if (elementKey === "earth") {
        gradient.addColorStop(0, "#14532d");
        gradient.addColorStop(0.5, "#15803d");
        gradient.addColorStop(1, "#4ade80");
      } else if (elementKey === "wind") {
        gradient.addColorStop(0, "#115e59");
        gradient.addColorStop(0.5, "#0d9488");
        gradient.addColorStop(1, "#2dd4bf");
      } else if (elementKey === "thunder") {
        gradient.addColorStop(0, "#78350f");
        gradient.addColorStop(0.5, "#d97706");
        gradient.addColorStop(1, "#fef08a");
      } else {
        gradient.addColorStop(0, "#1f2937");
        gradient.addColorStop(0.5, "#4b5563");
        gradient.addColorStop(1, "#9ca3af");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 800);

      // Draw shiny highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(350, 0);
      ctx.lineTo(0, 450);
      ctx.closePath();
      ctx.fill();

      // Card frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 14;
      ctx.strokeRect(15, 15, 570, 770);

      // Card Title Text
      ctx.fillStyle = "#ffffff";
      ctx.font = "black 32px sans-serif";
      ctx.fillText(analysis?.card?.title || "Stray Cat Hunter", 45, 75);

      // Subtitle
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(`${analysis?.breed || "Kucing"} - ${analysis?.card?.element?.name || "Neutral"} Element`, 45, 110);

      // Main image renderer
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Draw image
        ctx.drawImage(img, 45, 140, 510, 400);

        // Frame around image
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 4;
        ctx.strokeRect(45, 140, 510, 400);

        // Battle Stat HUD Background panel
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(45, 560, 510, 190);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.strokeRect(45, 560, 510, 190);

        // Core points and stats
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(`POWER: ${analysis?.card?.power || 1500}`, 65, 600);
        
        ctx.font = "16px sans-serif";
        ctx.fillText(`SKILL: ${analysis?.card?.skill || "Aura Meong"}`, 65, 635);
        ctx.fillText(`ATK: ${analysis?.card?.battleStats?.attack || 75}  |  DEF: ${analysis?.card?.battleStats?.defense || 75}  |  SPD: ${analysis?.card?.battleStats?.speed || 75}`, 65, 670);

        ctx.font = "italic 14px sans-serif";
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.fillText(analysis?.card?.lore || "Nekomon hebat yang berhasil mencapai tingkat evolusi.", 65, 715);

        // Direct Download programmatic execute
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `Nekomon_${analysis?.card?.title || "Card"}_${elementKey}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSavingToast("💾 Kartu Nekomón versi animasi telah otomatis disimpan ke galeri perangkatmu!");
      };
      img.src = captured?.dataUrl || "";
    } catch (err) {
      console.error("Gagal mengekspor kartu:", err);
      setSavingToast("⚠️ Gagal mengekspor kartu, namun data Anda tetap aman.");
    }
  };

  return (
    <div className="screen relative">
      {(!analysis?.isCat || analyzing) && (
        <div className="result-image-wrap">
          {captured?.dataUrl && <img src={captured.dataUrl} alt="capture" className="result-image" />}
          {captured?.lat != null && (
            <div className="gps-tag">
              <MapPin size={12} /> {captured.lat.toFixed(5)}, {captured.lng.toFixed(5)}
              {captured.accuracy != null && ` (±${Math.round(captured.accuracy)}m)`}
            </div>
          )}
        </div>
      )}

      {analyzing && (
        <div className="analyzing-box flex flex-col items-center gap-3">
          <div className="spinner" />
          <span className="text-sm font-semibold">
            AI sedang menganalisis karakteristik kucingmu dan merapalkan sihir anime... Mohon tunggu!
          </span>
        </div>
      )}

      {!analyzing && analysis?.isCat && (
        <div className="success-box">
          <div className="result-image-wrap">
            {captured?.dataUrl && (
              <img
                src={captured.dataUrl}
                alt="Foto asli kucing terverifikasi"
                className="result-image"
                style={{ objectFit: "cover" }}
              />
            )}
            {captured?.lat != null && (
              <div className="gps-tag">
                <MapPin size={12} /> {captured.lat.toFixed(5)}, {captured.lng.toFixed(5)}
              </div>
            )}
          </div>
          
          <div className="success-header">
            <Check size={20} color="#1F7A4D" />
            <span className="success-title">Kucing Terverifikasi! +10 Poin</span>
          </div>

          <p className="empty-text" style={{ fontSize: "13px", textAlign: "center", marginBottom: "12px", background: "#f0fdf4", color: "#166534", padding: "12px", borderRadius: "10px", border: "1.5px solid #bbf7d0" }}>
            ✓ Foto asli berhasil disimpan di <strong>Galeri Foto Asli</strong>! Pergi ke Galeri untuk menempa (forge) foto ini menjadi Kartu Nekomon Anime impianmu!
          </p>

          {captured?.lat != null && (
            <DetailRow
              label="Lokasi"
              value={`${captured.lat.toFixed(5)}, ${captured.lng.toFixed(5)}${
                captured.accuracy != null ? ` (+/-${Math.round(captured.accuracy)}m)` : ""
              }`}
            />
          )}
          <DetailRow label="Warna bulu" value={analysis.color} />
          <DetailRow label="Perkiraan ras" value={analysis.breed} />
          <DetailRow label="Kondisi" value={analysis.condition} />
          <DetailRow label="Keyakinan AI" value={`${analysis.confidence}%`} />

          <button className="hunt-button mt-4 animate-bounce" onClick={onViewGallery} style={{ width: "100%" }}>
            <Sparkles size={18} /> Buka Galeri Foto Asli
          </button>
          <button className="secondary-button" onClick={onDone} style={{ width: "100%", marginTop: "8px" }}>
            Lanjut Berburu
          </button>
        </div>
      )}

      {!analyzing && analysis && !analysis.isCat && (
        <div className="fail-box">
          <AlertTriangle size={20} color="#B8430B" />
          <span className="fail-text">{analysis.message}</span>
          <button className="hunt-button" onClick={onRetry}>
            Coba Lagi
          </button>
          <button className="link-button" onClick={onDone}>
            Kembali ke Beranda
          </button>
        </div>
      )}

      {/* Full Immersive Evolve Success Celebration Screen (Features 2 & 3) */}
      {celebrating && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="absolute inset-0 bg-radial-gradient from-orange-500/10 to-transparent pointer-events-none" />
          
          <div className="evolve-success-modal max-w-sm w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center shadow-2xl space-y-6">
            <div className="relative flex justify-center">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 blur-xl opacity-75 animate-pulse" />
              <div className="relative bg-neutral-950 p-4 rounded-full border border-orange-500/40">
                <Sparkles size={48} className="text-orange-500 animate-spin" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white leading-tight">
                💥 Evolve Berhasil!
              </h3>
              <p className="text-lg font-bold text-orange-400">
                Nekomón kamu telah mencapai wujud {analysis?.card?.element?.name}!
              </p>
            </div>

            {/* Rendering Evolved Anime Card with dynamic particle layers! */}
            <div className="scale-90 transform origin-top max-w-[280px] mx-auto">
              <CaptureCard captured={captured} analysis={analysis} />
            </div>

            {savingToast && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                <span>{savingToast}</span>
              </div>
            )}

            <button
              className="hunt-button w-full mt-2"
              onClick={() => {
                setCelebrating(false);
                setSavingToast("");
              }}
            >
              Luar Biasa!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
