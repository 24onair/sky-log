"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import {
  getAllBanners, createBanner, updateBanner,
  deleteBanner, uploadBannerImage,
} from "@/lib/supabase/banners";
import { Banner } from "@/lib/schemas/banner";
import { ChevronLeft, Trash2, Plus, Eye, EyeOff, Upload, ExternalLink } from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";
const ALLOWED_TYPES = ["image/jpeg", "image/gif"];
const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function AdminBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // form state
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
      try {
        const data = await getAllBanners();
        setBanners(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "로드 실패");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleFile = (f: File | null) => {
    if (!f) { setFile(null); setPreview(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("JPG, GIF 파일만 등록 가능합니다"); return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleAdd = async () => {
    if (!file) { setError("이미지를 선택하세요"); return; }
    if (!linkUrl.trim()) { setError("링크 URL을 입력하세요"); return; }
    if (banners.filter((b) => b.is_active).length >= 4 && banners.length >= 4) {
      setError("배너는 최대 4개까지 등록할 수 있습니다"); return;
    }
    setIsSubmitting(true); setError(null);
    try {
      const imageUrl = await uploadBannerImage(file);
      const created = await createBanner({
        image_url: imageUrl,
        link_url: linkUrl.trim(),
        is_active: true,
        sort_order: sortOrder,
      });
      setBanners((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setLinkUrl(""); setSortOrder(0); setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, { is_active: !banner.is_active });
      setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, is_active: !b.is_active } : b));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업데이트 실패");
    }
  };

  const handleOrder = async (banner: Banner, order: number) => {
    try {
      await updateBanner(banner.id, { sort_order: order });
      setBanners((prev) =>
        prev.map((b) => b.id === banner.id ? { ...b, sort_order: order } : b)
          .sort((a, b) => a.sort_order - b.sort_order)
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "업데이트 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("배너를 삭제하시겠습니까?")) return;
    try {
      await deleteBanner(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  if (loading) return (
    <div style={{ minHeight: "calc(100vh - 48px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f5f7" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const activeBanners = banners.filter((b) => b.is_active);

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "20px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/tasks" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
            <ChevronLeft size={15} strokeWidth={2} />타스크
          </Link>
          <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>배너 광고 관리</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "rgba(0,0,0,0.4)" }}>활성 {activeBanners.length} / 4</span>
        </div>

        {/* Add Form */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>새 배너 등록</p>

          {/* Image upload */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <label style={{ ...label, marginBottom: 0 }}>이미지 (JPG, GIF)</label>
              <span style={{ fontSize: 11, color: "rgba(0,0,0,0.36)" }}>권장 사이즈: <strong style={{ color: "rgba(0,0,0,0.5)" }}>760 × 120 px</strong> · 최소 380 × 60 px · 가로 6:1 비율</span>
            </div>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
              style={{
                border: "2px dashed rgba(0,0,0,0.14)", borderRadius: 10, padding: "14px",
                cursor: "pointer", textAlign: "center", background: preview ? "#000" : "#fafafa",
                position: "relative", overflow: "hidden", minHeight: 80,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {preview ? (
                <img src={preview} alt="미리보기" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <Upload size={22} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)" }} />
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>클릭하거나 파일을 드래그하세요</span>
                  <span style={{ fontSize: 11, color: "rgba(0,0,0,0.28)" }}>JPG, GIF 지원</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.gif,image/jpeg,image/gif" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Link URL */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>링크 URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="sk-input"
            />
          </div>

          {/* Sort order */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>노출 순서 (낮을수록 먼저)</label>
            <input
              type="number"
              value={sortOrder}
              min={0}
              max={99}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="sk-input"
              style={{ width: 100 }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: "#ff3b30" }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleAdd}
            disabled={isSubmitting}
            className="sk-btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: 14, borderRadius: 10, display: "flex", alignItems: "center", gap: 6, opacity: isSubmitting ? 0.6 : 1 }}
          >
            <Plus size={15} strokeWidth={2} />
            {isSubmitting ? "등록 중..." : "배너 등록"}
          </button>
        </div>

        {/* Banner list */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>등록된 배너 ({banners.length})</p>
          {banners.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "16px 0" }}>등록된 배너가 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {banners.map((b) => (
                <div
                  key={b.id}
                  style={{
                    borderRadius: 10, border: "1px solid rgba(0,0,0,0.08)",
                    overflow: "hidden", opacity: b.is_active ? 1 : 0.5,
                    background: "#fff",
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ background: "#000", maxHeight: 90, overflow: "hidden" }}>
                    <img src={b.image_url} alt="배너" style={{ width: "100%", height: "auto", maxHeight: 90, objectFit: "cover", display: "block" }} />
                  </div>

                  {/* Controls */}
                  <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Link */}
                    <a
                      href={b.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, fontSize: 12, color: "#0071e3", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <ExternalLink size={11} strokeWidth={1.5} />
                      {b.link_url}
                    </a>

                    {/* Sort order */}
                    <input
                      type="number"
                      value={b.sort_order}
                      min={0} max={99}
                      onChange={(e) => handleOrder(b, Number(e.target.value))}
                      style={{ width: 48, fontSize: 12, padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(0,0,0,0.12)", textAlign: "center" }}
                    />

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(b)}
                      title={b.is_active ? "비활성화" : "활성화"}
                      style={{ padding: 6, borderRadius: 6, border: "none", background: b.is_active ? "rgba(52,199,89,0.1)" : "rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      {b.is_active
                        ? <Eye size={14} strokeWidth={1.5} style={{ color: "#34c759" }} />
                        : <EyeOff size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)" }} />
                      }
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(b.id)}
                      style={{ padding: 6, borderRadius: 6, border: "none", background: "rgba(255,59,48,0.07)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <Trash2 size={14} strokeWidth={1.5} style={{ color: "#ff3b30" }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL hint */}
        <div style={{ background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.15)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0071e3", letterSpacing: "0.06em", marginBottom: 6 }}>SUPABASE 설정 안내</p>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.56)", lineHeight: 1.6 }}>
            SQL Editor에서 아래 쿼리 실행 후, Storage에서 <strong>banners</strong> 버킷(공개)을 생성하세요.
          </p>
          <pre style={{ fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "8px 10px", marginTop: 8, overflowX: "auto", color: "#1d1d1f", lineHeight: 1.5 }}>
{`create table public.banners (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  link_url text not null,
  is_active boolean default true,
  sort_order smallint default 0,
  created_at timestamptz default now()
);
alter table public.banners enable row level security;
create policy "public_read" on public.banners
  for select using (is_active = true);
create policy "auth_all" on public.banners
  for all using (auth.role() = 'authenticated');`}
          </pre>
        </div>

      </div>
    </div>
  );
}
