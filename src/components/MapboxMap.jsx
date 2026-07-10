import { useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function MapboxMap({ cats, token }) {
  const center = useMemo(() => {
    const lat = cats.reduce((s, c) => s + c.lat, 0) / cats.length;
    const lng = cats.reduce((s, c) => s + c.lng, 0) / cats.length;
    return { latitude: lat, longitude: lng, zoom: 13 };
  }, [cats]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: cats.map((c, i) => ({
        type: "Feature",
        properties: { id: i, color: c.color },
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      })),
    }),
    [cats]
  );

  return (
    <div className="map-container">
      <Map
        mapboxAccessToken={token}
        initialViewState={center}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <Source id="cats" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={50}>
          <Layer
            id="clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": "#FF7A33",
              "circle-radius": ["step", ["get", "point_count"], 16, 5, 22, 15, 28],
              "circle-opacity": 0.85,
            }}
          />
          <Layer
            id="cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": "{point_count_abbreviated}",
              "text-size": 12,
            }}
            paint={{ "text-color": "#ffffff" }}
          />
          <Layer
            id="unclustered-point"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": "#FF7A33",
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
            }}
          />
        </Source>
      </Map>
    </div>
  );
}
