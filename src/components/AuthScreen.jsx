import { useState } from "react";
import { Cat, LogIn, UserPlus, AlertTriangle, Key, Mail, Sparkles, X, CheckCircle, Send } from "lucide-react";
import { forgotPassword } from "../services/api";

export default function AuthScreen({ onLogin, onRegister, error }) {
  const [mode, setMode] = useState("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Forgot Password feature state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") {
        await onRegister({ email, username, password });
      } else {
        await onLogin({ username, password });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setForgotBusy(true);
    setForgotError("");
    setForgotSuccessMessage("");
    try {
      const res = await forgotPassword({ email: forgotEmail });
      setForgotSuccessMessage(res.message || "Tautan reset password telah dikirim ke email kamu. Silakan cek kotak masuk atau folder spam.");
      setForgotEmail("");
    } catch (err) {
      setForgotError(err.message || "Gagal mengirim permintaan reset password.");
    } finally {
      setForgotBusy(false);
    }
  };

  return (
    <div className="screen auth-screen relative">
      <div className="auth-brand">
        <Cat size={34} color="#FF7A33" />
        <div>
          <div className="logo-text">Stray Cat Hunter</div>
          <div className="auth-subtitle">Masuk untuk menyimpan poin, galeri, dan klasemen.</div>
        </div>
      </div>

      <div className="period-tabs">
        <button className={`period-tab ${mode === "register" ? "active" : ""}`} onClick={() => { setMode("register"); setForgotSuccessMessage(""); }}>
          Daftar
        </button>
        <button className={`period-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setForgotSuccessMessage(""); }}>
          Masuk
        </button>
      </div>

      {error && (
        <div className="error-box">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {forgotSuccessMessage && (
        <div className="toast-box mb-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-3 rounded-lg flex gap-2 items-start text-sm">
          <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>{forgotSuccessMessage}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={submit}>
        {mode === "register" && (
          <>
            <label className="field-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="nama@email.com"
              className="text-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </>
        )}

        <label className="field-label" htmlFor="username">
          {mode === "register" ? "Choose Username (Unique)" : "Username atau Email"}
        </label>
        <input
          id="username"
          className="text-input"
          placeholder={mode === "register" ? "username_unik" : "Username atau Email kamu"}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          minLength={mode === "register" ? 3 : 1}
          required
        />

        <label className="field-label" htmlFor="password">
          {mode === "register" ? "Create Password" : "Password"}
        </label>
        <input
          id="password"
          className="text-input"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={mode === "register" ? 8 : 1}
          required
        />

        {mode === "login" && (
          <div className="flex justify-end mt-1 mb-3">
            <button
              type="button"
              className="text-xs text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1 font-semibold"
              onClick={() => {
                setShowForgotModal(true);
                setForgotSuccessMessage("");
                setForgotError("");
              }}
            >
              <Key size={12} /> 🔑 Forgot Password?
            </button>
          </div>
        )}

        <button className="hunt-button" disabled={busy} type="submit">
          {mode === "register" ? <UserPlus size={20} /> : <LogIn size={20} />}
          {busy ? "Memproses..." : mode === "register" ? "🚀 Create Account" : "Masuk"}
        </button>
      </form>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-md w-full relative shadow-2xl">
            <button
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
              onClick={() => setShowForgotModal(false)}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Key size={22} className="text-orange-500" />
              <h3 className="text-lg font-bold text-white">Reset Password</h3>
            </div>

            <p className="text-sm text-neutral-400 mb-4">
              Masukkan alamat email kamu yang terdaftar untuk menerima tautan reset password otomatis.
            </p>

            {forgotError && (
              <div className="error-box text-xs py-2 px-3 mb-4 bg-red-950/50 border-red-800/30 text-red-300">
                <AlertTriangle size={14} /> {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="forgotEmail">
                  Email Address
                </label>
                <input
                  id="forgotEmail"
                  type="email"
                  placeholder="nama@email.com"
                  className="text-input"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
                  onClick={() => setShowForgotModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={forgotBusy}
                  className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors flex items-center gap-1 font-semibold shadow-md disabled:opacity-50"
                >
                  <Send size={14} /> {forgotBusy ? "Mengirim..." : "Kirim Tautan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
