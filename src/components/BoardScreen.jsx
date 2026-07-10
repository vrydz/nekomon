import { useState } from "react";
import ScreenHeader from "./ScreenHeader";
import { fetchLeaderboard } from "../services/api";

const SEED_LEADERBOARD = [
  { name: "RinaKitty", points: 340 },
  { name: "BangAndi", points: 290 },
  { name: "MeongLover", points: 210 },
  { name: "PakRT07", points: 150 },
];

export default function BoardScreen({ leaderboard, userName, userPoints, onBack }) {
  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState(leaderboard);
  const [loading, setLoading] = useState(false);

  const loadPeriod = async (p) => {
    setPeriod(p);
    setLoading(true);
    try {
      const data = await fetchLeaderboard(p);
      setRows(data);
    } catch {
      const merged = [...SEED_LEADERBOARD, { name: userName, points: userPoints }].sort(
        (a, b) => b.points - a.points
      );
      setRows(merged);
    } finally {
      setLoading(false);
    }
  };

  const display = rows.length
    ? rows
    : [...SEED_LEADERBOARD, { name: userName, points: userPoints }].sort((a, b) => b.points - a.points);

  return (
    <div className="screen">
      <ScreenHeader title="Klasemen Hunter" onBack={onBack} />

      <div className="period-tabs">
        {[
          { id: "daily", label: "Harian" },
          { id: "weekly", label: "Mingguan" },
          { id: "all", label: "Sepanjang Masa" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`period-tab ${period === tab.id ? "active" : ""}`}
            onClick={() => loadPeriod(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="empty-text">Memuat...</p>}

      <div className="board-list">
        {display.map((h, i) => (
          <div key={`${h.name}-${i}`} className={`board-row ${h.name === userName ? "board-row-self" : ""}`}>
            <span className="board-rank">{i + 1}</span>
            <span className="board-name">{h.name}</span>
            <span className="board-points">{h.points} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
