import { useState } from "react";
import { Camera, Download, Flame, MapPin, Mountain, Share2, Snowflake, Sparkles, Trash2, Wind, X, Zap } from "lucide-react";
import ScreenHeader from "./ScreenHeader";
import { forgeNekomonCard, destroyNekomonCard } from "../services/api";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const rarityLabels = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legend: "Legendary",
  ultimate: "Ultimate",
};

const rarityColors = {
  common: ["#4b5563", "#d1d5db"],
  rare: ["#0f2f66", "#93c5fd"],
  epic: ["#450a0a", "#f97316"],
  legend: ["#64748b", "#f8fafc"],
  ultimate: ["#92400e", "#fde68a"],
};

const elementIcons = {
  fire: Flame,
  ice: Snowflake,
  earth: Mountain,
  wind: Wind,
  thunder: Zap,
};

function safeName(value) {
  return String(value || "nekomon-card")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      lines += 1;
      line = word;
      if (lines >= maxLines) return y;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y);
  return y + lineHeight;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderCardPng(item) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const card = item.card || {};
  const rarity = card.rarity || "common";
  const [from, to] = rarityColors[rarity] || rarityColors.common;
  const gradient = ctx.createLinearGradient(0, 0, 900, 1350);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 1350);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 18;
  ctx.strokeRect(35, 35, 830, 1280);

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(80, 82, 740, 92);
  ctx.fillStyle = "#111827";
  ctx.font = "800 44px Arial";
  ctx.textAlign = "center";
  ctx.fillText(card.title || item.breed || "Nekomon", 450, 142);

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(105, 210, 690, 760);
  
  // Tampilkan foto anime (imageThumb) di PNG card jika ada, fallback ke original
  const imageToDraw = item.imageThumb || item.imageOriginal;
  if (imageToDraw?.startsWith?.("data:image/")) {
    const img = await loadImage(imageToDraw);
    const scale = Math.max(690 / img.width, 760 / img.height);
    const width = img.width * scale;
    const height = img.height * scale;
    ctx.drawImage(img, 105 + (690 - width) / 2, 210 + (760 - height) / 2, width, height);
  }
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 8;
  ctx.strokeRect(105, 210, 690, 760);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillRect(80, 1005, 740, 230);
  ctx.fillStyle = "#111827";
  ctx.font = "800 30px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`RARITY: ${rarityLabels[rarity] || "Common"}`, 110, 1060);
  ctx.fillText(`ELEMENT: ${card.element?.name || "None"}`, 110, 1104);
  ctx.fillText(`ATK ${card.battleStats?.attack || "-"} / DEF ${card.battleStats?.defense || "-"} / SPD ${card.battleStats?.speed || "-"}`, 110, 1148);
  ctx.font = "24px Arial";
  wrapText(ctx, card.lore || `${item.breed || "Kucing"} ${item.color || ""}`.trim(), 110, 1194, 680, 30, 3);

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillRect(80, 1260, 740, 44);
  ctx.fillStyle = "#111827";
  ctx.font = "700 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("NEKOMON GALLERY VAULT", 450, 1289);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png", 1));
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function CardDetail({ item, onClose, user, playSound, onDestroyComplete }) {
  const [message, setMessage] = useState("");
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [destroying, setDestroying] = useState(false);
  const [error, setError] = useState("");

  const card = item.card || {};
  const rarity = card.rarity || "common";
  const ElementIcon = elementIcons[card.element?.key] || Sparkles;

  const rarityPoints = {
    common: 10,
    rare: 15,
    epic: 20,
    legend: 30,
    legendary: 30,
    ultimate: 50,
  };
  const refundValue = rarityPoints[rarity] || 10;

  const downloadCard = async () => {
    const blob = await renderCardPng(item);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeName(card.title || item.breed)}.png`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Kartu berhasil diunduh! Cek folder 'Nekomon' di galeri ponselmu.");
  };

  const shareCard = async () => {
    const blob = await renderCardPng(item);
    const file = new File([blob], `${safeName(card.title || item.breed)}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: card.title || "Kartu Nekomon", text: card.lore || "Kartu Nekomon baru!", files: [file] });
      setMessage("Kartu siap dibagikan.");
    } else {
      await downloadCard();
      setMessage("Browser belum mendukung share langsung. Kartu sudah diunduh untuk dibagikan manual.");
    }
  };

  const handleDestroy = async () => {
    setDestroying(true);
    setError("");
    playSound?.("click");
    try {
      const result = await destroyNekomonCard({
        catchId: item.id,
        userId: user.id,
      });
      playSound?.("success");
      onDestroyComplete(result);
    } catch (err) {
      setError(err.message || "Gagal menghancurkan kartu.");
      playSound?.("fail");
    } finally {
      setDestroying(false);
    }
  };

  return (
    <div className="card-detail-overlay">
      <div className="card-detail-view">
        <button className="card-detail-close" onClick={onClose} aria-label="Tutup detail kartu">
          <X size={20} />
        </button>
        <div className={`capture-card capture-card-${rarity} capture-card-element-${card.element?.key || "neutral"}`}>
          <div className="capture-card-shine" />
          <div className="capture-card-top">
            <div>
              <div className="capture-card-title">{card.title || item.breed || "Nekomon"}</div>
              <div className="capture-card-subtitle">{item.breed || "Kucing misterius"}</div>
            </div>
            <div className="rarity-chip">{rarityLabels[rarity] || "Common"}</div>
          </div>
          <div className={`capture-card-art relative overflow-hidden art-style-${card.artStyle}`}>
            {item.imageThumb?.startsWith?.("data:image/") ? (
              <img src={item.imageThumb} alt={card.title || "Kartu Nekomon"} className={`capture-card-image anime-card-image style-${card.artStyle} element-${card.element?.key}`} />
            ) : (
              <div className="gallery-placeholder"><Camera size={24} /></div>
            )}
            <div className="capture-card-aura" />
            {card.artStyle && (
              <div className={`style-overlay style-overlay-${card.artStyle}`} />
            )}
            {card.element && (
              <div className="element-emblem z-20">
                <ElementIcon size={24} />
              </div>
            )}
            {card.element && (
              <div className={`vfx-overlay vfx-overlay-${card.element.key}`}>
                <div className="vfx-particles" />
              </div>
            )}
          </div>
          <div className="capture-card-info">
            <div className="card-type-row">
              <span>{card.element?.label || "No Element"}</span>
              <span>{item.confidence}% AI</span>
            </div>
            <div className="battle-stats">
              <span>ATK {card.battleStats?.attack || "-"}</span>
              <span>DEF {card.battleStats?.defense || "-"}</span>
              <span>SPD {card.battleStats?.speed || "-"}</span>
            </div>
            <p className="card-lore">{card.lore || "Analisis AI belum tersedia."}</p>
          </div>
        </div>
        <div className="card-detail-panel">
          <DetailRow label="Nama" value={card.title || item.breed || "Nekomon"} />
          <DetailRow label="Elemen" value={card.element?.name || "Belum ada"} />
          <DetailRow label="Kelangkaan" value={rarityLabels[rarity] || "Common"} />
          <DetailRow label="Style" value={card.artStyle === "ghibli" ? "Studio Ghibli" : "MAPPA Studio"} />
          <DetailRow label="Analisis" value={`${item.color || "Kucing"} / ${item.condition || "Tidak diketahui"}`} />
          <button className="hunt-button" onClick={downloadCard}>
            <Download size={18} /> Download to Device
          </button>
          <button className="secondary-button detail-share-button" onClick={shareCard}>
            <Share2 size={18} /> Share to Social Media
          </button>
          
          {confirmDestroy ? (
            <div className="destroy-confirm-panel">
              <p className="destroy-confirm-text">
                Hancurkan kartu ini? Kamu akan mendapatkan kembali <strong>{refundValue} Poin</strong>. Kartu anime akan dihapus, dan kucing ini akan kembali menjadi foto biasa.
              </p>
              {error && <div className="toast-box" style={{ background: "#fee2e2", color: "#b91c1c", marginTop: "4px" }}>{error}</div>}
              <div className="destroy-confirm-buttons">
                <button
                  className="destroy-confirm-btn destroy-confirm-yes"
                  onClick={handleDestroy}
                  disabled={destroying}
                >
                  {destroying ? "Menghancurkan..." : "Ya, Hancurkan"}
                </button>
                <button
                  className="destroy-confirm-btn destroy-confirm-no"
                  onClick={() => setConfirmDestroy(false)}
                  disabled={destroying}
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <button className="destroy-button" onClick={() => setConfirmDestroy(true)}>
              <Trash2 size={16} /> Destroy Card (+{refundValue} Poin)
            </button>
          )}

          {message && <div className="toast-box">{message}</div>}
        </div>
      </div>
    </div>
  );
}

function OriginalDetail({ item, onClose, onOpenForge }) {
  const isForged = !!item.card;

  return (
    <div className="card-detail-overlay">
      <div className="card-detail-view">
        <button className="card-detail-close" onClick={onClose} aria-label="Tutup detail foto">
          <X size={20} />
        </button>
        <div className="capture-card" style={{ border: "1.5px solid #e8dcc8", background: "#fff" }}>
          <div className="capture-card-top">
            <div>
              <div className="capture-card-title">{item.breed || "Kucing Liar"}</div>
              <div className="capture-card-subtitle">{item.color || "Warna unik"}</div>
            </div>
            <div className="rarity-chip" style={{ background: "#e8dcc8", color: "#5f5244" }}>Original Photo</div>
          </div>
          <div className="capture-card-art relative overflow-hidden" style={{ background: "#f2e7d8" }}>
            {item.imageOriginal?.startsWith?.("data:image/") || item.imageThumb?.startsWith?.("data:image/") ? (
              <img src={item.imageOriginal || item.imageThumb} alt="Foto asli kucing" className="capture-card-image" style={{ objectFit: "cover" }} />
            ) : (
              <div className="gallery-placeholder"><Camera size={24} /></div>
            )}
          </div>
          <div className="capture-card-info" style={{ background: "#fff" }}>
            <div className="card-type-row" style={{ color: "#8a7a66" }}>
              <span>Ditemukan pada:</span>
              <span>{formatDate(item.createdAt)}</span>
            </div>
            <p className="card-lore" style={{ color: "#5f5244", fontStyle: "normal" }}>
              Analisis Kucing: {item.condition || "Kondisi sehat"}. Tingkat kecocokan AI: {item.confidence}%
            </p>
          </div>
        </div>

        <div className="card-detail-panel">
          {isForged ? (
            <div style={{ textAlign: "center", color: "#ff7a33", fontWeight: "700" }}>
              ✓ Kucing ini telah berhasil ditempa menjadi Kartu Nekomon! Cek di tab "Galeri Kartu Nekomón".
            </div>
          ) : (
            <button className="hunt-button" onClick={onOpenForge} style={{ width: "100%" }}>
              <Sparkles size={18} /> Forge to Nekomón Card
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ForgeModal({ item, onClose, onForgeComplete, user, playSound }) {
  const [artStyle, setArtStyle] = useState("ghibli");
  const [element, setElement] = useState("fire");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (user.points < 50) {
      setError("Saldo Poin kamu tidak cukup! Konversi memerlukan 50 Poin.");
      playSound("fail");
      return;
    }
    setError("");
    setLoading(true);
    playSound?.("click");
    try {
      const result = await forgeNekomonCard({
        catchId: item.id,
        userId: user.id,
        artStyle,
        element,
      });

      playSound?.("success");
      onForgeComplete(result);
    } catch (err) {
      setError(err.message || "Gagal menempa kartu Nekomon.");
      playSound?.("fail");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-detail-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {loading ? (
        <div className="forge-modal forge-loading-overlay">
          <div className="forge-loader" />
          <div className="forge-loading-text">Menempa Kartu Nekomon...</div>
          <p className="empty-text">AI sedang melukis ulang kucing kamu dengan gaya dan elemen pilihanmu. Mohon tunggu sebentar!</p>
        </div>
      ) : (
        <div className="forge-modal">
          <button className="card-detail-close" onClick={onClose} aria-label="Tutup menu">
            <X size={20} />
          </button>
          <div className="forge-title">Forge to Nekomón Card</div>
          <p className="empty-text" style={{ fontSize: "12px", textAlign: "center", marginBottom: "16px" }}>
            Ubah foto kucing asli menjadi kartu TCG Anime legendaris beranimasi! Biaya: <strong>50 Poin</strong> (Saldo: {user?.points || 0} Poin)
          </p>

          {error && <div className="toast-box" style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", marginBottom: "12px" }}>{error}</div>}

          <div>
            <div className="forge-section-title">Pilih Art Style</div>
            <div className="style-options">
              <button
                type="button"
                className={`style-option-card ${artStyle === "ghibli" ? "selected" : ""}`}
                onClick={() => setArtStyle("ghibli")}
              >
                <div className="style-option-name">Studio Ghibli</div>
                <div className="style-option-desc">Klasik, Hangat, Pastel</div>
              </button>
              <button
                type="button"
                className={`style-option-card ${artStyle === "mappa" ? "selected" : ""}`}
                onClick={() => setArtStyle("mappa")}
              >
                <div className="style-option-name">MAPPA Studio</div>
                <div className="style-option-desc">Dinamis, Tajam, Sinematik</div>
              </button>
            </div>
          </div>

          <div>
            <div className="forge-section-title">Pilih Elemen</div>
            <div className="element-options-grid">
              {[
                { key: "fire", name: "Fire", icon: Flame },
                { key: "ice", name: "Ice", icon: Snowflake },
                { key: "earth", name: "Earth", icon: Mountain },
                { key: "wind", name: "Wind", icon: Wind },
                { key: "thunder", name: "Thunder", icon: Zap },
              ].map((elem) => {
                const Icon = elem.icon;
                return (
                  <button
                    key={elem.key}
                    type="button"
                    className={`element-option-card ${element === elem.key ? "selected" : ""}`}
                    onClick={() => setElement(elem.key)}
                  >
                    <Icon size={18} className={element === elem.key ? "text-orange-500" : "text-gray-500"} />
                    <span className="element-option-name">{elem.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button className="hunt-button" style={{ width: "100%", marginTop: "20px" }} onClick={handleConfirm}>
            Confirm Forge (50 Poin)
          </button>
        </div>
      )}
    </div>
  );
}

export default function GalleryScreen({ catches, onBack, onHunt, user, setUser, setCatLog, refreshLeaderboard, playSound }) {
  const [activeTab, setActiveTab] = useState("original");
  const [selectedOriginal, setSelectedOriginal] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [forgeTarget, setForgeTarget] = useState(null);

  // Filter lists based on tab
  // Tab 1: Galeri Foto Asli shows all photos
  const originalCatches = catches;
  // Tab 2: Galeri Kartu Nekomon only shows forged cards
  const forgedCatches = catches.filter(c => c.card !== null);

  const handleForgeComplete = (result) => {
    // Update user points
    if (setUser) {
      setUser(u => ({ ...u, points: result.points }));
    }
    // Update list of catches
    if (setCatLog) {
      setCatLog(log => log.map(item => item.id === result.catch_.id ? result.catch_ : item));
    }
    // Refresh leaderboards
    if (refreshLeaderboard) {
      refreshLeaderboard();
    }
    
    // Close modals and open the forged card detail!
    setForgeTarget(null);
    setSelectedOriginal(null);
    setSelectedCard(result.catch_);
  };

  return (
    <div className="screen">
      <ScreenHeader title="Nekomon Gallery Vault" onBack={onBack} />

      <div className="gallery-tabs">
        <button
          className={`gallery-tab-btn ${activeTab === "original" ? "active" : ""}`}
          onClick={() => setActiveTab("original")}
        >
          Galeri Foto Asli
        </button>
        <button
          className={`gallery-tab-btn ${activeTab === "cards" ? "active" : ""}`}
          onClick={() => setActiveTab("cards")}
        >
          Galeri Kartu Nekomón
        </button>
      </div>

      {activeTab === "original" ? (
        originalCatches.length === 0 ? (
          <div className="empty-gallery">
            <Camera size={30} color="#FF7A33" />
            <p className="empty-text">Belum ada foto kucing asli tersimpan. Mulai berburu untuk mengisi galeri.</p>
            <button className="hunt-button" onClick={onHunt}>
              <Camera size={20} /> Mulai Berburu
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {originalCatches.map((item) => (
              <button key={item.id} className="gallery-card gallery-card-button" onClick={() => setSelectedOriginal(item)}>
                {item.imageOriginal?.startsWith?.("data:image/") || item.imageThumb?.startsWith?.("data:image/") ? (
                  <img src={item.imageOriginal || item.imageThumb} alt={item.breed || "Foto asli"} className="gallery-image" />
                ) : (
                  <div className="gallery-placeholder">
                    <Camera size={24} />
                  </div>
                )}
                <div className="gallery-meta">
                  <div className="gallery-title">{item.breed || "Kucing Liar"}</div>
                  <div className="gallery-detail" style={{ color: item.card ? "#16a34a" : "#ca8a04", fontWeight: "700" }}>
                    {item.card ? "✓ Forged" : "⚡ Ready to Forge"}
                  </div>
                  <div className="gallery-detail">{formatDate(item.createdAt)}</div>
                  {item.lat != null && (
                    <div className="gallery-location">
                      <MapPin size={12} /> {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        forgedCatches.length === 0 ? (
          <div className="empty-gallery">
            <Sparkles size={30} color="#FF7A33" />
            <p className="empty-text">Belum ada kartu Nekomon yang ditempa. Pergi ke tab "Galeri Foto Asli" dan pilih foto kucing untuk di-forge!</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {forgedCatches.map((item) => (
              <button key={item.id} className="gallery-card gallery-card-button" onClick={() => setSelectedCard(item)}>
                <div className="relative aspect-square w-full overflow-hidden">
                  {item.imageThumb?.startsWith?.("data:image/") ? (
                    <img src={item.imageThumb} alt={item.card?.title || "Kartu Nekomon"} className={`gallery-image anime-card-image style-${item.card?.artStyle} element-${item.card?.element?.key}`} />
                  ) : (
                    <div className="gallery-placeholder">
                      <Camera size={24} />
                    </div>
                  )}
                  {item.card?.artStyle && (
                    <div className={`style-overlay style-overlay-${item.card.artStyle}`} />
                  )}
                </div>
                <div className="gallery-meta">
                  <div className="gallery-title">{item.card?.title || "Nekomon"}</div>
                  <div className="gallery-detail" style={{ textTransform: "uppercase", fontWeight: "700" }}>{rarityLabels[item.card?.rarity || "common"]}</div>
                  <div className="gallery-detail">{item.card?.element?.name || "No Element"}</div>
                  <div className="gallery-detail">{formatDate(item.createdAt)}</div>
                  {item.lat != null && (
                    <div className="gallery-location">
                      <MapPin size={12} /> {Number(item.lat).toFixed(4)}, {Number(item.lng).toFixed(4)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {selectedOriginal && (
        <OriginalDetail
          item={selectedOriginal}
          onClose={() => setSelectedOriginal(null)}
          onOpenForge={() => setForgeTarget(selectedOriginal)}
        />
      )}

      {selectedCard && (
        <CardDetail
          item={selectedCard}
          onClose={() => setSelectedCard(null)}
          user={user}
          playSound={playSound}
          onDestroyComplete={(result) => {
            if (setUser) {
              setUser(u => ({ ...u, points: result.points }));
            }
            if (setCatLog) {
              setCatLog(log => log.map(item => item.id === result.catch_.id ? result.catch_ : item));
            }
            if (refreshLeaderboard) {
              refreshLeaderboard();
            }
            setSelectedCard(null);
          }}
        />
      )}

      {forgeTarget && (
        <ForgeModal
          item={forgeTarget}
          user={user}
          playSound={playSound}
          onClose={() => setForgeTarget(null)}
          onForgeComplete={handleForgeComplete}
        />
      )}
    </div>
  );
}
