import { useState, useEffect } from "react";
import { X, Crosshair, AlertTriangle, Cpu, Shield, ShieldCheck, ShieldAlert, Sparkles, Layers } from "lucide-react";

export default function HuntScreen({ videoRef, onShutter, onCancel }) {
  const [scanMode, setScanMode] = useState("real"); // "real", "moire", "nocat"
  const [initLatency, setInitLatency] = useState(true);
  const [eyeDetected, setEyeDetected] = useState(true);
  const [earsDetected, setEarsDetected] = useState(true);
  const [moireFound, setMoireFound] = useState(false);
  const [flatSurface, setFlatSurface] = useState(false);

  // Error pop-up state
  const [errorPopUp, setErrorPopUp] = useState("");

  useEffect(() => {
    // Simulate ML Engine initialization latency check
    const timer = setTimeout(() => {
      setInitLatency(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Update live ML scanning flags based on selected test mode
    if (scanMode === "real") {
      setEyeDetected(true);
      setEarsDetected(true);
      setMoireFound(false);
      setFlatSurface(false);
    } else if (scanMode === "moire") {
      setEyeDetected(true);
      setEarsDetected(true);
      setMoireFound(true);
      setFlatSurface(true);
    } else if (scanMode === "nocat") {
      setEyeDetected(false);
      setEarsDetected(false);
      setMoireFound(false);
      setFlatSurface(false);
    }
  }, [scanMode]);

  // Handle capture attempt
  const handleShutterClick = () => {
    // 1. Digital Screen / Moiré / Flat Surface Check
    if (moireFound || flatSurface) {
      setErrorPopUp(
        "❌ Gagal Mengambil Gambar! Sistem mendeteksi foto diambil dari layar atau gambar statis. Silakan foto kucing asli secara langsung di dunia nyata untuk membuat Nekomón!"
      );
      return;
    }

    // 2. Cat Detection Check
    if (!eyeDetected || !earsDetected) {
      setErrorPopUp(
        "❌ Kucing tidak terdeteksi! Pastikan wajah atau tubuh kucingmu terlihat jelas di dalam frame."
      );
      return;
    }

    // 3. All checks passed! Execute capture
    onShutter();
  };

  return (
    <div className="camera-screen flex flex-col justify-between h-screen text-white select-none">
      {/* Top Overlay */}
      <div className="camera-overlay-top z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <button className="icon-button-ghost bg-black/60 hover:bg-black/80 text-white rounded-full p-2" onClick={onCancel}>
            <X size={22} />
          </button>
          <div className="hunt-tag bg-orange-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse">
            <Crosshair size={14} className="animate-spin" />
            <span>Cari kucing liar...</span>
          </div>
        </div>

        {/* Real-time ML Status Panel */}
        <div className="bg-black/70 border border-neutral-800 rounded-xl p-3 w-full space-y-2 text-[11px] font-mono shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-1.5">
            <span className="flex items-center gap-1 font-bold text-orange-400">
              <Cpu size={12} /> ENGINE ML LOKAL
            </span>
            <span className={initLatency ? "text-amber-400" : "text-emerald-400"}>
              ● {initLatency ? "Initializing..." : "Live Scan (<12ms)"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Layer 1: Object Detection */}
            <div className={`p-1.5 rounded border ${!eyeDetected && !earsDetected ? "bg-red-950/20 border-red-900/30 text-red-400" : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"}`}>
              <div className="font-bold flex items-center gap-1">
                <Layers size={10} /> 1. Objek
              </div>
              <div className="mt-1">
                {scanMode === "nocat" ? "⚠️ No Cat" : "✓ Kucing"}
              </div>
            </div>

            {/* Layer 2: Moiré Detection */}
            <div className={`p-1.5 rounded border ${moireFound ? "bg-red-950/20 border-red-900/30 text-red-400" : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"}`}>
              <div className="font-bold flex items-center gap-1">
                <ShieldAlert size={10} /> 2. Moiré
              </div>
              <div className="mt-1">
                {moireFound ? "⚠️ Terdeteksi" : "✓ Bersih"}
              </div>
            </div>

            {/* Layer 3: Depth/3D Liveness */}
            <div className={`p-1.5 rounded border ${flatSurface ? "bg-red-950/20 border-red-900/30 text-red-400" : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"}`}>
              <div className="font-bold flex items-center gap-1">
                <Sparkles size={10} /> 3. Dimensi
              </div>
              <div className="mt-1">
                {flatSurface ? "⚠️ Flat 2D" : "✓ Real 3D"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Camera Viewport Box */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="video absolute inset-0 w-full h-full object-cover opacity-90" />
        
        {/* Futuristic HUD target scanning frame */}
        <div className="absolute inset-12 border border-white/20 pointer-events-none rounded-2xl flex items-center justify-center">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-lg" />
          
          {/* Real-time floating scan tag */}
          <div className="bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 text-center font-mono text-[10px]">
            <div className="text-white/80 font-bold">SCANNING ZONE</div>
            <div className="text-orange-400 text-[9px] mt-0.5">
              {scanMode === "real" ? "COORDS ACQUIRING..." : "WARNING: SCAN FAILURES"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control panel and Mode Simulator */}
      <div className="camera-overlay-bottom z-10 p-5 bg-gradient-to-t from-black/90 via-black/75 to-transparent flex flex-col gap-4 items-center">
        {/* ML Simulator Selection Controls (required to allow user to experience/verify both modes) */}
        <div className="w-full max-w-xs bg-neutral-900/95 border border-neutral-800 p-2.5 rounded-xl space-y-1.5 shadow-2xl backdrop-blur-md">
          <div className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider font-mono text-center flex items-center justify-center gap-1.5">
            <Shield size={12} className="text-orange-500" /> SIMULASI INTEGRASI KAMERA
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => { setScanMode("real"); setErrorPopUp(""); }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${scanMode === "real" ? "bg-emerald-600 text-white shadow" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
            >
              🟢 Real Cat
            </button>
            <button
              onClick={() => { setScanMode("moire"); setErrorPopUp(""); }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${scanMode === "moire" ? "bg-red-600 text-white shadow" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
            >
              🔴 Monitor/Layar
            </button>
            <button
              onClick={() => { setScanMode("nocat"); setErrorPopUp(""); }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all text-center ${scanMode === "nocat" ? "bg-amber-600 text-white shadow" : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"}`}
            >
              🟡 No Cat
            </button>
          </div>
        </div>

        {/* Capture Shutter Button */}
        <div className="flex items-center justify-center relative w-full">
          {/* Shutter Button - [Block Action]: Freeze if Moiré/Flat Detected */}
          <button
            className={`shutter-button relative transition-all duration-300 ${
              scanMode === "moire" ? "border-red-600 bg-red-950/40 cursor-not-allowed opacity-50 scale-90" : "border-white hover:scale-105 active:scale-95"
            }`}
            onClick={handleShutterClick}
            aria-label="Jepret"
          >
            <span className={`shutter-inner transition-all duration-300 ${scanMode === "moire" ? "bg-red-600" : "bg-orange-500"}`} />
          </button>
        </div>
      </div>

      {/* ML High-Security Error Pop-up Modal */}
      {errorPopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-950/50 p-3 rounded-full border border-red-500/40 text-red-500 animate-bounce">
                <AlertTriangle size={36} />
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              ML Scan Failure
            </h3>
            
            <p className="text-sm text-neutral-300 leading-relaxed font-semibold">
              {errorPopUp}
            </p>

            <div className="pt-2">
              <button
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs"
                onClick={() => setErrorPopUp("")}
              >
                Kembali ke Kamera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
