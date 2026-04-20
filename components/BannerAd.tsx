"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getActiveBanners } from "@/lib/supabase/banners";
import { Banner } from "@/lib/schemas/banner";

const INTERVAL_MS = 4000;

export function BannerAd() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getActiveBanners().then(setBanners).catch(() => {});
  }, []);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, INTERVAL_MS);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length > 1) {
      startTimer();
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [banners.length, startTimer]);

  if (banners.length === 0) return null;

  const current = banners[index];

  return (
    <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "rgba(0,0,0,0.08) 0 1px 6px", position: "relative", background: "#000" }}>
      <a
        href={current.link_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "block", cursor: "pointer" }}
        onClick={() => { if (timerRef.current) clearInterval(timerRef.current); startTimer(); }}
      >
        <img
          key={current.id}
          src={current.image_url}
          alt="광고"
          style={{ width: "100%", height: "auto", maxHeight: 120, objectFit: "cover", display: "block" }}
        />
      </a>

      {banners.length > 1 && (
        <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 5, pointerEvents: "none" }}>
          {banners.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? "#fff" : "rgba(255,255,255,0.45)",
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>
      )}

      <div style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: "rgba(255,255,255,0.55)", fontWeight: 500, letterSpacing: "0.04em", pointerEvents: "none" }}>
        AD
      </div>
    </div>
  );
}
