"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

interface FlightMapProps {
  trackPoints?: [number, number, number][]; // [lon, lat, alt]
}

export function FlightMap({ trackPoints }: FlightMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [128.0, 36.5],
      zoom: 6.5,
      attributionControl: false,
    });

    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    mapRef.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update track when points change
  useEffect(() => {
    if (!mapRef.current || !trackPoints || trackPoints.length < 2) return;

    const coords = trackPoints.map(([lon, lat]) => [lon, lat] as [number, number]);

    const bounds = coords.reduce(
      (b, coord) => b.extend(coord),
      new mapboxgl.LngLatBounds(coords[0], coords[0])
    );

    const render = () => {
      const m = mapRef.current!;

      // Remove existing layers/sources
      ["track-shadow", "track", "takeoff", "landing"].forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
        if (m.getSource(id)) m.removeSource(id);
      });

      // Track shadow (glow effect)
      m.addSource("track-shadow", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      m.addLayer({
        id: "track-shadow",
        type: "line",
        source: "track-shadow",
        paint: {
          "line-color": "#0071e3",
          "line-width": 6,
          "line-opacity": 0.18,
          "line-blur": 4,
        },
      });

      // Track line
      m.addSource("track", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: coords },
        },
      });
      m.addLayer({
        id: "track",
        type: "line",
        source: "track",
        paint: {
          "line-color": "#0071e3",
          "line-width": 2.5,
          "line-opacity": 0.92,
        },
      });

      // Takeoff dot (green)
      m.addSource("takeoff", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: coords[0] },
        },
      });
      m.addLayer({
        id: "takeoff",
        type: "circle",
        source: "takeoff",
        paint: {
          "circle-radius": 7,
          "circle-color": "#34c759",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#fff",
        },
      });

      // Landing dot (red)
      m.addSource("landing", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coords[coords.length - 1],
          },
        },
      });
      m.addLayer({
        id: "landing",
        type: "circle",
        source: "landing",
        paint: {
          "circle-radius": 7,
          "circle-color": "#ff3b30",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#fff",
        },
      });

      m.fitBounds(bounds, { padding: 72, duration: 900, maxZoom: 14 });
    };

    if (mapRef.current.isStyleLoaded()) {
      render();
    } else {
      mapRef.current.once("load", render);
    }
  }, [trackPoints]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
