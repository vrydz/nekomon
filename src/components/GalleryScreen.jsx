import { useState } from "react";
import { Camera, Download, Flame, MapPin, Mountain, Share2, Snowflake, Sparkles, Wind, X, Zap } from "lucide-react";
import ScreenHeader from "./ScreenHeader";

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
  if (item.imageThumb?.startsWith?.("data:image/")) {
    const img = await loadImage(item.imageThumb);
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

function CardDetail({ item, onClose }) {
  const [message, setMessage] = useState("");
  const card = item.card || {};
  const rarity = card.rarity || "common";
  const ElementIcon = elementIcons[card.element?.key] || Sparkles;

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
          <div className="capture-card-art relative overflow-hidden">
            {item.imageThumb?.startsWith?.("data:image/") ? (
              <img src={item.imageThumb} alt={card.title || "Kartu Nekomon"} className="capture-card-image anime-card-image" />
            ) : (
              <div className="gallery-placeholder"><Camera size={24} /></div>
            )}
            <div className="capture-card-aura" />
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
          <DetailRow label="Analisis" value={`${item.color || "Kucing"} / ${item.condition || "Tidak diketahui"}`} />
          <button className="hunt-button" onClick={downloadCard}>
            <Download size={18} /> Download to Device
          </button>
          <button className="secondary-button detail-share-button" onClick={shareCard}>
            <Share2 size={18} /> Share to Social Media
          </button>
          {message && <div className="toast-box">{message}</div>}
        </div>
      </div>
    </div>
  );
}

export default function GalleryScreen({ catches, onBack, onHunt }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="screen">
      <ScreenHeader title="Nekomon Gallery Vault" onBack={onBack} />

      {catches.length === 0 ? (
        <div className="empty-gallery">
          <Camera size={30} color="#FF7A33" />
          <p className="empty-text">Belum ada foto kucing tersimpan. Mulai berburu untuk mengisi galeri.</p>
          <button className="hunt-button" onClick={onHunt}>
            <Camera size={20} /> Mulai Berburu
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {catches.map((item) => (
            <button key={item.id} className="gallery-card gallery-card-button" onClick={() => setSelected(item)}>
              {item.imageThumb?.startsWith?.("data:image/") ? (
                <img src={item.imageThumb} alt={item.card?.title || item.color || "Foto kucing"} className="gallery-image anime-card-image" />
              ) : (
                <div className="gallery-placeholder">
                  <Camera size={24} />
                </div>
              )}
              <div className="gallery-meta">
                <div className="gallery-title">{item.card?.title || item.color || "Nekomon"}</div>
                <div className="gallery-detail">{rarityLabels[item.card?.rarity || "common"]}</div>
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
      )}

      {selected && <CardDetail item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
