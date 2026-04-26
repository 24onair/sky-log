"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import { Waypoint } from "@/lib/schemas/task";
import { circlePolygon, waypointRoleColor, waypointMarkerText, optimumLinePath } from "@/lib/utils/taskUtils";

interface TaskMapProps {
  waypoints: Waypoint[];
  isAddMode: boolean;
  onMapClick: (lat: number, lon: number) => void;
  onWaypointMove: (id: string, lat: number, lon: number) => void;
  onWaypointClick?: (id: string) => void;
  flyToTarget?: { center: [number, number]; zoom: number } | null;
  referenceWaypoints?: Waypoint[]; // waypoint set overlay (gray, non-draggable)
  onRefWaypointClick?: (wp: Waypoint) => void; // click ref marker → add to task
}

export function TaskMap({
  waypoints,
  isAddMode,
  onMapClick,
  onWaypointMove,
  onWaypointClick,
  flyToTarget,
  referenceWaypoints = [],
  onRefWaypointClick,
}: TaskMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const refMarkersRef = useRef<mapboxgl.Marker[]>([]);
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
    const circleFeatures = wps.map((wp, i) => ({
      type: "Feature" as const,
      properties: { id: wp.id, color: waypointRoleColor(i, wps.length) },
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

    // ── optimum path (connected through cylinders) ────────────────
    const optCoords = optimumLinePath(wps);
    const optData: GeoJSON.Feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: optCoords },
    };

    if (m.getSource("optline")) {
      (m.getSource("optline") as mapboxgl.GeoJSONSource).setData(optData);
    } else {
      m.addSource("optline", { type: "geojson", data: optData });
      m.addLayer(
        {
          id: "optline",
          type: "line",
          source: "optline",
          paint: {
            "line-color": "#F0B90B",
            "line-width": 2,
            "line-opacity": 0.9,
          },
        },
        "circles-fill"
      );
    }

    // ── markers (draggable) ───────────────────────────────────────
    // Always recreate so color/text stay in sync with positional roles
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    wps.forEach((wp, i) => {
      const color = waypointRoleColor(i, wps.length);
      const text = waypointMarkerText(i, wps.length);

      const el = document.createElement("div");
      el.style.cssText = `
        min-width: 26px; height: 26px; padding: 0 5px;
        background: ${color};
        border: 2.5px solid white;
        border-radius: 13px;
        cursor: grab;
        box-shadow: 0 2px 8px rgba(0,0,0,0.32);
        display: flex; align-items: center; justify-content: center;
        font-size: 9px; font-weight: 800; color: white;
        font-family: -apple-system, sans-serif;
        user-select: none; letter-spacing: 0.02em;
      `;
      el.textContent = text;
      el.title = wp.name || text;

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
    });
  }, []);

  // Render reference waypoints (gray, non-draggable)
  const renderRefLayers = useCallback((wps: Waypoint[]) => {
    const m = mapRef.current;
    if (!m || !styleLoadedRef.current) return;

    // Remove old ref markers
    refMarkersRef.current.forEach((mk) => mk.remove());
    refMarkersRef.current = [];

    const circles = wps.map((wp) => ({
      type: "Feature" as const,
      properties: { id: wp.id },
      geometry: {
        type: "Polygon" as const,
        coordinates: [circlePolygon([wp.lon, wp.lat], wp.radius)],
      },
    }));
    const circleData: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: circles };

    if (m.getSource("ref-circles")) {
      (m.getSource("ref-circles") as mapboxgl.GeoJSONSource).setData(circleData);
    } else {
      m.addSource("ref-circles", { type: "geojson", data: circleData });
      m.addLayer(
        { id: "ref-circles-fill", type: "fill", source: "ref-circles", paint: { "fill-color": "#636366", "fill-opacity": 0.07 } },
        "circles-fill"
      );
      m.addLayer(
        { id: "ref-circles-outline", type: "line", source: "ref-circles", paint: { "line-color": "#636366", "line-width": 1, "line-opacity": 0.4, "line-dasharray": [3, 3] } },
        "circles-fill"
      );
    }

    wps.forEach((wp) => {
      const el = document.createElement("div");
      const clickable = !!onRefWaypointClick;
      el.style.cssText = `
        min-width: 22px; height: 22px; padding: 0 4px;
        background: #8e8e93; border: 2px solid white; border-radius: 11px;
        box-shadow: 0 1px 5px rgba(0,0,0,0.22);
        display: flex; align-items: center; justify-content: center;
        font-size: 8px; font-weight: 700; color: white;
        font-family: -apple-system, sans-serif; user-select: none;
        cursor: ${clickable ? "pointer" : "default"};
        transition: background 0.12s, transform 0.12s;
      `;
      el.textContent = wp.name.slice(0, 4);
      el.title = clickable ? `${wp.name} — 클릭하여 추가` : wp.name;
      if (clickable) {
        el.addEventListener("mouseenter", () => { el.style.background = "#0071e3"; el.style.transform = "scale(1.15)"; });
        el.addEventListener("mouseleave", () => { el.style.background = "#8e8e93"; el.style.transform = "scale(1)"; });
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onRefWaypointClick(wp);
        });
      }
      const mk = new mapboxgl.Marker({ element: el }).setLngLat([wp.lon, wp.lat]).addTo(m);
      refMarkersRef.current.push(mk);
    });
  }, [onRefWaypointClick]);

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
      renderRefLayers(referenceWaypoints);

      // CTR airspace overlay (static GeoJSON, no API needed)
      (async () => {
        try {
          const res = await fetch("/airspace-ctr.geojson");
          if (!res.ok) return;
          const geojson: GeoJSON.FeatureCollection = await res.json();
          if (map.getSource("ctr")) return;
          map.addSource("ctr", { type: "geojson", data: geojson });
          map.addLayer(
            { id: "ctr-fill", type: "fill", source: "ctr", paint: { "fill-color": "#ff3b30", "fill-opacity": 0.18 } },
            "circles-fill"
          );
          map.addLayer(
            { id: "ctr-outline", type: "line", source: "ctr", paint: { "line-color": "#ff3b30", "line-width": 1.8, "line-opacity": 0.85, "line-dasharray": [4, 2] } },
            "circles-fill"
          );
          map.addLayer({ id: "ctr-label", type: "symbol", source: "ctr", layout: { "text-field": ["get", "name"], "text-size": 10, "text-anchor": "center" }, paint: { "text-color": "#cc1a12", "text-halo-color": "white", "text-halo-width": 1.5 } });

          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
          map.on("mouseenter", "ctr-fill", (e) => {
            map.getCanvas().style.cursor = "pointer";
            const f = e.features?.[0];
            if (!f) return;
            const p = f.properties ?? {};
            popup.setLngLat(e.lngLat).setHTML(`<b>${p.name}</b><br/>반경 ${p.radiusNm}nm<br/>${p.altLow} ~ ${p.altHigh}`).addTo(map);
          });
          map.on("mouseleave", "ctr-fill", () => {
            map.getCanvas().style.cursor = isAddModeRef.current ? "crosshair" : "";
            popup.remove();
          });
        } catch {
          // silently ignore CTR load failure
        }
      })();
    });

    map.on("click", (e) => {
      if (!isAddModeRef.current) return;
      onMapClickRef.current(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      refMarkersRef.current.forEach((m) => m.remove());
      refMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      styleLoadedRef.current = false;
    };
  }, [renderLayers, renderRefLayers]);

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

  // Re-render reference layer when referenceWaypoints changes
  useEffect(() => {
    renderRefLayers(referenceWaypoints);
  }, [referenceWaypoints, renderRefLayers]);


  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
