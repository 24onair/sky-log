"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getActiveAnnouncement } from "@/lib/supabase/announcements";
import { Announcement } from "@/lib/schemas/announcement";

const STORAGE_KEY = (id: string) => `sk_popup_dismissed_${id}`;

export default function AnnouncementPopup() {
  const [popup, setPopup] = useState<Announcement | null>(null);

  useEffect(() => {
    getActiveAnnouncement().then((a) => {
      if (!a) return;
      if (localStorage.getItem(STORAGE_KEY(a.id))) return; // already dismissed
      setPopup(a);
    }).catch(() => {});
  }, []);

  const dismiss = () => {
    if (popup) localStorage.setItem(STORAGE_KEY(popup.id), "1");
    setPopup(null);
  };

  if (!popup) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 9000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
          animation: "fadeIn 0.18s ease",
        }}
      >
        {/* Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 20,
            maxWidth: 420,
            width: "100%",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
            animation: "slideUp 0.22s ease",
          }}
        >
          {/* Image */}
          {popup.image_url && (
            <div style={{ background: "#000", maxHeight: 220, overflow: "hidden" }}>
              <img
                src={popup.image_url}
                alt="공지 이미지"
                style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "cover", display: "block" }}
              />
            </div>
          )}

          {/* Content */}
          <div style={{ padding: "22px 22px 20px" }}>
            {/* Close button */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", lineHeight: 1.35, margin: 0 }}>
                {popup.title}
              </h2>
              <button
                onClick={dismiss}
                style={{
                  flexShrink: 0, width: 28, height: 28,
                  borderRadius: "50%", border: "none",
                  background: "rgba(0,0,0,0.07)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(0,0,0,0.45)",
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            <p style={{
              fontSize: 14, color: "rgba(0,0,0,0.65)", lineHeight: 1.7,
              margin: "0 0 20px", whiteSpace: "pre-wrap",
            }}>
              {popup.body}
            </p>

            <button
              onClick={dismiss}
              style={{
                width: "100%", padding: "12px",
                borderRadius: 12, border: "none",
                background: "#1d1d1f", color: "#fff",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}
