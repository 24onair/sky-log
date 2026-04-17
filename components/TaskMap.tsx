"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { Waypoint } from "@/lib/schemas/task";
import { circlePolygon, waypointColor } from "@/lib/utils/taskUtils";

interface TaskMapProps {
  waypoints: Waypoint[];
  isAddMode: boolean;
  onMapClick: (lat: number, lon: number) => void;
  onWaypointMove: (id: string, lat: number, lon: number) => void;
  onWaypointClick?: (id: string) => void;
  flyToTarget?: { center: [number, number]; zoom: number } | null;
}

export function TaskMap({
  waypoints,
  isAddMode,
  onMapClick,
  onWaypointMove,
  onWaypointClick,
  flyToTarget,
}: TaskMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const isAddModeRef = useRef(isAddMode);
  const waypointsRef = useRef(waypoints);
  const onMapClickRef = useRef(onMapClick);
  const onWaypointMoveRef = useRef(onWaypointMove);
  const onWaypointClickRef = useRef(onWaypointClick);
  const styleLoadedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isAddModeRef.current = isAddMode; }, [isAddMode]);
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onWaypointMoveRef.current = onWaypointMove; }, [onWaypointMove]);
  useEffect(() => { onWaypointClickRef.current = onWaypointClick; }, [onWaypointClick]);

  // Update cursor when add mode changes (keep pan/zoom enabled so user can drag to position)
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.getCanvas().style.cursor = isAddMode ? "crosshair" : "";
  }, [isAddMode]);

  const renderLayers = useCallback((wps: Waypoint[]) => {
    const m = mapRef.current;
    if (!m || !styleLoadedRef.current) return;

    // ── circles (fill + outline) ──────────────────────────────────
    const circleFeatures = wps.map((wp) => ({
      type: "Feature" as const,
      properties: { id: wp.id, color: waypointColor(wp.type) },
      geometry: {
        type: "Polygon" as const,
        coordinates: [circlePolygon([wp.lon, wp.lat], wp.radius)],
      },
    }));

    const circleData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: circleFeatures,
    };

    if (m.getSource("circles")) {
      (m.getSource("circles") as mapboxgl.GeoJSONSource).setData(circleData);
    } else {
      m.addSource("circles", { type: "geojson", data: circleData });
      m.addLayer({
        id: "circles-fill",
        type: "fill",
        source: "circles",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.12,
        },
      });
      m.addLayer({
        id: "circles-outline",
        type: "line",
        source: "circles",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 1.5,
          "line-opacity": 0.7,
          "line-dasharray": [4, 2],
        },
      });
    }

    // ── task line ─────────────────────────────────────────────────
    const lineData: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: wps.map((wp) => [wp.lon, wp.lat]),
      },
    };

    if (m.getSource("taskline")) {
      (m.getSource("taskline") as mapboxgl.GeoJSONSource).setData(lineData);
    } else {
      m.addSource("taskline", { type: "geojson", data: lineData });
      m.addLayer(
        {
          id: "taskline",
          type: "line",
          source: "taskline",
          paint: {
            "line-color": "#636366",
            "line-width": 1.5,
            "line-opacity": 0.5,
            "line-dasharray": [3, 3],
          },
        },
        "circles-fill" // insert below circles
      );
    }

    // ── markers (draggable) ───────────────────────────────────────
    const currentIds = new Set(wps.map((wp) => wp.id));

    // Remove stale markers
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    wps.forEach((wp) => {
      const color = waypointColor(wp.type);

      if (markersRef.current.has(wp.id)) {
        markersRef.current.get(wp.id)!.setLngLat([wp.lon, wp.lat]);
      } else {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 20px; height: 20px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.32);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 800; color: white;
          font-family: -apple-system, sans-serif;
          user-select: none;
        `;
        el.title = wp.name;

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([wp.lon, wp.lat])
          .addTo(m);

        marker.on("dragend", () => {
          const { lng, lat } = marker.getLngLat();
          onWaypointMoveRef.current(wp.id, lat, lng);
        });

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onWaypointClickRef.current?.(wp.id);
        });

        markersRef.current.set(wp.id, marker);
      }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [128.0, 36.5],
      zoom: 7,
      attributionControl: false,
    });

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-left"
    );

    map.on("load", () => {
      styleLoadedRef.current = true;
      renderLayers(waypointsRef.current);
    });

    map.on("click", (e) => {
      if (!isAddModeRef.current) return;
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
  }, [renderLayers]);

  // Fly to target when search result is selected
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    mapRef.current.flyTo({ center: flyToTarget.center, zoom: flyToTarget.zoom, duration: 900 });
  }, [flyToTarget]);

  // Re-render layers whenever waypoints change
  useEffect(() => {
    renderLayers(waypoints);

    // Fit bounds when we have 2+ waypoints
    if (waypoints.length >= 2 && mapRef.current) {
      const coords = waypoints.map((wp) => [wp.lon, wp.lat] as [number, number]);
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new mapboxgl.LngLatBounds(coords[0], coords[0])
      );
      mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 600 });
    }
  }, [waypoints, renderLayers]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
