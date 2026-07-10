import { Camera, CheckCircle, Download, Sparkles } from "lucide-react";

function PreviewImage({ captured }) {
  return (
    <div className="photo-preview-wrap">
      {captured?.dataUrl && <img src={captured.dataUrl} alt="Preview foto kucing" className="photo-preview-image" />}
    </div>
  );
}

export function CameraPreviewScreen({ captured, onRetake, onSave }) {
  return (
    <div className="screen">
      <div className="preview-title">Camera Preview</div>
      <PreviewImage captured={captured} />
      <div className="preview-actions">
        <button className="secondary-button preview-action-button" onClick={onRetake}>
          <Camera size={18} /> Retake
        </button>
        <button className="hunt-button preview-action-button" onClick={onSave}>
          <Download size={18} /> Save Photo
        </button>
      </div>
    </div>
  );
}

export function PhotoSavedPreviewScreen({ captured, toast, onConvert, onRetake }) {
  return (
    <div className="screen">
      <div className="preview-title">Photo Saved Preview</div>
      {toast && (
        <div className="toast-box">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}
      <PreviewImage captured={captured} />
      <button className="hunt-button" onClick={onConvert}>
        <Sparkles size={20} /> Convert to Nekomon Card
      </button>
      <button
        className="evolve-main-button evolve-main-button-locked"
        type="button"
        disabled
        title="Kamu harus meng-convert foto kucingmu menjadi kartu Nekomon terlebih dahulu untuk membuka fitur ini!"
      >
        <Sparkles size={17} />
        Upgrade Element (Locked)
      </button>
      <p className="locked-help">Kamu harus meng-convert foto kucingmu menjadi kartu Nekomon terlebih dahulu untuk membuka fitur ini!</p>
      <button className="link-button" onClick={onRetake}>
        Ambil ulang foto
      </button>
    </div>
  );
}
