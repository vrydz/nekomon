import { Camera, MapPin, Trophy, Award, AlertTriangle, Cat, Images, LogOut, Volume2, VolumeX } from "lucide-react";

export default function HomeScreen({
  userName,
  points,
  catCount,
  badges,
  error,
  onHunt,
  onMap,
  onBoard,
  onGallery,
  onLogout,
  soundMuted,
  onToggleSound,
}) {
  return (
    <div className="screen">
      <div className="header-bar">
        <div className="logo-row">
          <Cat size={26} color="#FF7A33" />
          <span className="logo-text">Stray Cat Hunter</span>
        </div>
        <div className="header-actions">
          <button className="small-icon-button" onClick={onToggleSound} title={soundMuted ? "Nyalakan suara" : "Matikan suara"}>
            {soundMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <button className="small-icon-button" onClick={onLogout} title="Keluar">
            <LogOut size={17} />
          </button>
        </div>
      </div>

      <div className="hunter-chip">Hunter: {userName}</div>

      <div className="stat-card">
        <div>
          <div className="stat-label">Poin Kamu</div>
          <div className="stat-value">{points}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="stat-label">Kucing Tertangkap</div>
          <div className="stat-value-small">{catCount}</div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="badge-row">
          {badges.map((b) => (
            <div key={b} className="badge-pill">
              <Award size={14} /> {b}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="error-box">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <button className="hunt-button" onClick={onHunt}>
        <Camera size={22} />
        Mulai Berburu
      </button>

      <div className="btn-row">
        <button className="secondary-button" onClick={onGallery}>
          <Images size={18} /> Galeri
        </button>
        <button className="secondary-button" onClick={onMap}>
          <MapPin size={18} /> Peta
        </button>
        <button className="secondary-button" onClick={onBoard}>
          <Trophy size={18} /> Klasemen
        </button>
      </div>

      <p className="footnote">
        Foto langsung dari kamera & lokasi GPS dikunci otomatis saat jepret. Tangkapan valid tersimpan ke galeri akun kamu.
      </p>
    </div>
  );
}
