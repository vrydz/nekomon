import { useState, useRef, useCallback, useEffect } from "react";
import {
  getSavedUser,
  registerUser,
  loginUser,
  clearSavedUser,
  analyzeCapture,
  submitCatch,
  evolveCatchType,
  fetchUserCatches,
  fetchLeaderboard,
  fetchCatMap,
  fetchConfig,
} from "./services/api";
import { compressImage } from "./utils/image";
import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import HuntScreen from "./components/HuntScreen";
import ResultScreen from "./components/ResultScreen";
import { CameraPreviewScreen, PhotoSavedPreviewScreen } from "./components/PhotoFlowScreen";
import MapScreen from "./components/MapScreen";
import BoardScreen from "./components/BoardScreen";
import GalleryScreen from "./components/GalleryScreen";
import { createCatAudio } from "./utils/sound";

export default function App() {
  const [screen, setScreen] = useState("auth");
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [captured, setCaptured] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [currentCatch, setCurrentCatch] = useState(null);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState(null);
  const [catLog, setCatLog] = useState([]);
  const [badges, setBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [mapCats, setMapCats] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [mapboxToken, setMapboxToken] = useState(import.meta.env.VITE_MAPBOX_TOKEN || "");
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem("cat-audio-muted") === "true");
  const [evolving, setEvolving] = useState(false);
  const [evolveMessage, setEvolveMessage] = useState("");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = createCatAudio({ muted: soundMuted });

    const unlockAudio = () => {
      audioRef.current?.startMusic();
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      audioRef.current?.destroy();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(soundMuted);
    localStorage.setItem("cat-audio-muted", String(soundMuted));
  }, [soundMuted]);

  const playSound = useCallback((effect) => {
    audioRef.current?.play(effect);
  }, []);

  const toggleSound = () => {
    playSound("click");
    setSoundMuted((muted) => !muted);
  };

  const loadUserCatches = useCallback(async (userId) => {
    try {
      const catches = await fetchUserCatches(userId);
      setCatLog(catches);
      return catches;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    getSavedUser().then(async (saved) => {
      if (!saved) return;
      setUser(saved);
      setBadges(saved.badges || []);
      await loadUserCatches(saved.id);
      setScreen("home");
    });
    fetchCatMap().then(setMapCats).catch(() => {});
    fetchConfig().then((cfg) => {
      if (cfg.mapboxToken) setMapboxToken(cfg.mapboxToken);
    });
  }, [loadUserCatches]);

  const completeAuth = async (action, payload) => {
    setError(null);
    try {
      const nextUser = await action(payload);
      setUser(nextUser);
      setBadges(nextUser.badges || []);
      await loadUserCatches(nextUser.id);
      playSound("success");
      setScreen("home");
    } catch (err) {
      playSound("fail");
      setError(err.message || "Gagal memproses akun.");
    }
  };

  const logout = () => {
    playSound("click");
    stopCamera();
    clearSavedUser();
    setUser(null);
    setCatLog([]);
    setBadges([]);
    setCaptured(null);
    setAnalysis(null);
    setCurrentCatch(null);
    setToast("");
    setError(null);
    setScreen("auth");
  };

  const refreshLeaderboard = useCallback(async () => {
    try {
      const data = await fetchLeaderboard();
      setLeaderboard(data);
    } catch {
      /* offline fallback handled in BoardScreen */
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!user) {
      setScreen("auth");
      return;
    }
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Browser ini tidak mendukung akses kamera (atau halaman tidak dibuka lewat HTTPS). Coba buka di Chrome/Safari langsung."
      );
      return;
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      setStream(s);
      playSound("start");
      setScreen("hunt");
    } catch (e) {
      playSound("fail");
      if (e.name === "NotAllowedError") {
        setError("Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi.");
      } else if (e.name === "NotFoundError") {
        setError("Tidak ditemukan kamera di perangkat ini.");
      } else if (e.name === "NotReadableError") {
        setError("Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain, lalu coba lagi.");
      } else if (location.protocol !== "https:" && location.hostname !== "localhost") {
        setError("Akses kamera butuh koneksi HTTPS.");
      } else {
        setError("Tidak bisa mengakses kamera: " + (e.message || "kesalahan tidak diketahui."));
      }
    }
  }, [playSound, user]);

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
    playSound("shutter");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!navigator.geolocation) {
      stopCamera();
      setError("Geolokasi tidak didukung browser ini. Aktifkan GPS atau gunakan browser lain.");
      setScreen("home");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        previewCapture(canvas.toDataURL("image/jpeg", 0.8), {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (geoErr) => {
        stopCamera();
        const msg =
          geoErr.code === 1
            ? "Izin lokasi ditolak. Aktifkan GPS di pengaturan browser/HP, lalu coba lagi."
            : "GPS tidak tersedia. Pastikan lokasi aktif dan mock location dimatikan.";
        setError(msg);
        setScreen("home");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const previewCapture = async (dataUrl, geo) => {
    stopCamera();
    setScreen("capturePreview");
    setAnalysis(null);
    setCurrentCatch(null);
    setEvolveMessage("");
    setToast("");

    try {
      const compressed = await compressImage(dataUrl, 1280, 0.75);
      setCaptured({ dataUrl: compressed, ...geo });
    } catch (err) {
      playSound("fail");
      setError(err.message || "Gagal memproses foto.");
      setScreen("home");
    }
  };

  const saveCapturedPhoto = () => {
    if (!captured?.dataUrl) return;
    sessionStorage.setItem("nekomon-temp-photo", JSON.stringify(captured));
    setToast("Foto berhasil disimpan! Siap untuk diubah menjadi Nekomon.");
    playSound("success");
    setScreen("photoSaved");
  };

  const convertSavedPhoto = async () => {
    const source = captured || JSON.parse(sessionStorage.getItem("nekomon-temp-photo") || "null");
    if (!source?.dataUrl) {
      setError("Foto belum tersimpan. Ambil foto lagi untuk membuat kartu Nekomon.");
      setScreen("home");
      return;
    }

    setCaptured(source);
    setScreen("result");
    setAnalyzing(true);
    setAnalysis(null);
    setCurrentCatch(null);
    setEvolveMessage("");

    try {
      const result = await analyzeCapture(source.dataUrl);
      setAnalysis(result);
      playSound(result.isCat ? "success" : "fail");

      if (result.isCat && user) {
        const saved = await submitCatch({
          userId: user.id,
          imageData: source.dataUrl,
          lat: source?.lat,
          lng: source?.lng,
          accuracy: source?.accuracy,
          analysis: result,
        });
        setUser((u) => ({ ...u, points: saved.points }));
        setCurrentCatch(saved.catch_);
        setCatLog((log) => [saved.catch_, ...log]);
        setBadges(saved.badges || []);
        setMapCats((cats) => [saved.catch_, ...cats]);
        sessionStorage.removeItem("nekomon-temp-photo");
        refreshLeaderboard();
      }
    } catch (err) {
      playSound("fail");
      setAnalysis({ isCat: false, message: err.message || "Gagal menganalisis foto." });
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    playSound("click");
    setCaptured(null);
    setAnalysis(null);
    setCurrentCatch(null);
    setEvolveMessage("");
    setToast("");
    setScreen("home");
  };

  const evolveCurrentCatch = async (element) => {
    if (!user || !currentCatch?.id) return;
    setEvolving(true);
    setEvolveMessage("");
    try {
      const result = await evolveCatchType({
        catchId: currentCatch.id,
        userId: user.id,
        element,
      });
      setUser((u) => ({ ...u, points: result.points }));
      setCurrentCatch(result.catch_);
      setAnalysis((prev) => (prev ? { ...prev, card: result.catch_.card } : prev));
      setCatLog((log) => log.map((item) => (item.id === result.catch_.id ? result.catch_ : item)));
      setMapCats((cats) => cats.map((item) => (item.id === result.catch_.id ? result.catch_ : item)));
      setEvolveMessage(result.message);
      playSound("success");
    } catch (err) {
      setEvolveMessage(err.message || "Upgrade elemen gagal.");
      playSound("fail");
    } finally {
      setEvolving(false);
    }
  };

  const openBoard = async () => {
    playSound("click");
    await refreshLeaderboard();
    setScreen("board");
  };

  const openMap = async () => {
    playSound("click");
    try {
      const cats = await fetchCatMap();
      setMapCats(cats);
    } catch {
      /* use local catLog as fallback */
    }
    setScreen("map");
  };

  const openGallery = async () => {
    playSound("click");
    if (user) await loadUserCatches(user.id);
    setScreen("gallery");
  };

  return (
    <div className="app">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {screen === "auth" && (
        <AuthScreen
          error={error}
          onRegister={(payload) => completeAuth(registerUser, payload)}
          onLogin={(payload) => completeAuth(loginUser, payload)}
        />
      )}

      {screen === "home" && (
        <HomeScreen
          userName={user?.name ?? "Kamu"}
          points={user?.points ?? 0}
          catCount={catLog.length}
          badges={badges}
          error={error}
          onHunt={startCamera}
          onMap={openMap}
          onBoard={openBoard}
          onGallery={openGallery}
          onLogout={logout}
          soundMuted={soundMuted}
          onToggleSound={toggleSound}
        />
      )}

      {screen === "hunt" && (
        <HuntScreen
          videoRef={videoRef}
          onShutter={shutter}
          onCancel={() => {
            playSound("click");
            stopCamera();
            setScreen("home");
          }}
        />
      )}

      {screen === "capturePreview" && (
        <CameraPreviewScreen
          captured={captured}
          onRetake={() => {
            setCaptured(null);
            setAnalysis(null);
            setCurrentCatch(null);
            setToast("");
            sessionStorage.removeItem("nekomon-temp-photo");
            startCamera();
          }}
          onSave={saveCapturedPhoto}
        />
      )}

      {screen === "photoSaved" && (
        <PhotoSavedPreviewScreen
          captured={captured}
          toast={toast}
          onConvert={convertSavedPhoto}
          onRetake={() => {
            setCaptured(null);
            setAnalysis(null);
            setCurrentCatch(null);
            setToast("");
            sessionStorage.removeItem("nekomon-temp-photo");
            startCamera();
          }}
        />
      )}

      {screen === "result" && (
        <ResultScreen
          captured={captured}
          analyzing={analyzing}
          analysis={analysis}
          catchRecord={currentCatch}
          userPoints={user?.points ?? 0}
          evolving={evolving}
          evolveMessage={evolveMessage}
          onEvolve={evolveCurrentCatch}
          onDone={reset}
          onRetry={() => {
            setCaptured(null);
            setAnalysis(null);
            setCurrentCatch(null);
            setEvolveMessage("");
            sessionStorage.removeItem("nekomon-temp-photo");
            startCamera();
          }}
        />
      )}

      {screen === "map" && (
        <MapScreen
          cats={mapCats.length ? mapCats : catLog}
          mapboxToken={mapboxToken}
          onBack={() => setScreen("home")}
        />
      )}

      {screen === "gallery" && (
        <GalleryScreen catches={catLog} onBack={() => setScreen("home")} onHunt={startCamera} />
      )}

      {screen === "board" && (
        <BoardScreen
          leaderboard={leaderboard}
          userName={user?.name ?? "Kamu"}
          userPoints={user?.points ?? 0}
          onBack={() => setScreen("home")}
        />
      )}
    </div>
  );
}
