import { lazy, Suspense } from "react";
import { MapPin } from "lucide-react";
import ScreenHeader from "./ScreenHeader";

const MapboxMap = lazy(() => import("./MapboxMap"));

function SchematicMap({ cats }) {
  const lats = cats.map((c) => c.lat);
  const lngs = cats.map((c) => c.lng);
  const minLat = Math.min(...lats, -1);
  const maxLat = Math.max(...lats, 1);
  const minLng = Math.min(...lngs, -1);
  const maxLng = Math.max(...lngs, 1);

  return (
    <div className="map-fallback">
      {cats.map((c, i) => {
        const x = ((c.lng - minLng) / (maxLng - minLng || 1)) * 90 + 5;
        const y = 90 - ((c.lat - minLat) / (maxLat - minLat || 1)) * 90;
        return (
          <div key={i} className="map-pin" style={{ left: `${x}%`, top: `${y}%` }} title={c.color}>
            <MapPin size={20} color="#FF7A33" fill="#FF7A33" />
          </div>
        );
      })}
    </div>
  );
}

export default function MapScreen({ cats, mapboxToken, onBack }) {
  const located = cats.filter((c) => c.lat != null);
  const hasMapbox = Boolean(mapboxToken);

  return (
    <div className="screen">
      <ScreenHeader title="Peta Kucing Liar" onBack={onBack} />
      {located.length === 0 ? (
        <p className="empty-text">Belum ada titik kucing tersimpan. Mulai berburu untuk mengisi peta!</p>
      ) : hasMapbox ? (
        <Suspense fallback={<p className="empty-text">Memuat peta...</p>}>
          <MapboxMap cats={located} token={mapboxToken} />
        </Suspense>
      ) : (
        <SchematicMap cats={located} />
      )}
      <p className="footnote">
        {hasMapbox
          ? "Peta interaktif dengan clustering otomatis saat zoom out."
          : "Set MAPBOX_TOKEN di server env untuk peta Mapbox penuh."}
      </p>
    </div>
  );
}
