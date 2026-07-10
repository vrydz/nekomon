export default function ScreenHeader({ title, onBack }) {
  return (
    <div className="sub-header">
      <button className="link-button" onClick={onBack}>
        ← Kembali
      </button>
      <span className="sub-header-title">{title}</span>
    </div>
  );
}
