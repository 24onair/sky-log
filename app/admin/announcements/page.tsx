"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/supabase/auth";
import {
  getAllAnnouncements, createAnnouncement, updateAnnouncement,
  deleteAnnouncement, uploadAnnouncementImage,
} from "@/lib/supabase/announcements";
import { Announcement } from "@/lib/schemas/announcement";
import { ChevronLeft, Trash2, Plus, Eye, EyeOff, Upload, Image } from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "24onair@gmail.com";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const label = { fontSize: 12, fontWeight: 500, color: "rgba(0,0,0,0.48)", display: "block", marginBottom: 5 } as React.CSSProperties;
const secHead = { fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(0,0,0,0.3)", textTransform: "uppercase" as const, marginBottom: 10 };

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const user = await getUser();
      if (!user) { router.push("/auth/login"); return; }
      if (user.email !== ADMIN_EMAIL) { router.push("/"); return; }
      try {
        setItems(await getAllAnnouncements());
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
      setError("JPG, PNG, GIF, WebP 파일만 등록 가능합니다"); return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleAdd = async () => {
    if (!title.trim()) { setError("제목을 입력하세요"); return; }
    if (!body.trim()) { setError("내용을 입력하세요"); return; }
    setIsSubmitting(true); setError(null);
    try {
      let imageUrl: string | null = null;
      if (file) imageUrl = await uploadAnnouncementImage(file);
      const created = await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl,
        is_active: true,
      });
      setItems((prev) => [created, ...prev]);
      setTitle(""); setBody(""); setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { is_active: !a.is_active });
      setItems((prev) => prev.map((x) => x.id === a.id ? { ...x, is_active: !x.is_active } : x));
    } catch (e) {
      setError(e instanceof Error ? e.message : "업데이트 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("팝업 공지를 삭제하시겠습니까?")) return;
    try {
      await deleteAnnouncement(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
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

  const activeCount = items.filter((x) => x.is_active).length;

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "20px 16px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500, color: "#1d1d1f", textDecoration: "none" }}>
            <ChevronLeft size={15} strokeWidth={2} />관리자
          </Link>
          <span style={{ color: "rgba(0,0,0,0.2)", fontSize: 13 }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f" }}>팝업 공지 관리</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: activeCount > 0 ? "#ff9500" : "rgba(0,0,0,0.4)" }}>
            활성 {activeCount}개
          </span>
        </div>

        {/* Create form */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>새 팝업 공지 등록</p>

          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목"
              className="sk-input"
            />
          </div>

          {/* Body */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>내용</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={4}
              className="sk-input"
              style={{ resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
            />
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: 14 }}>
            <label style={label}>이미지 (선택, JPG · PNG · GIF · WebP)</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null); }}
              style={{
                border: "2px dashed rgba(0,0,0,0.14)", borderRadius: 10, padding: "14px",
                cursor: "pointer", textAlign: "center",
                background: preview ? "#000" : "#fafafa",
                minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {preview ? (
                <img src={preview} alt="미리보기" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <Upload size={22} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)" }} />
                  <span style={{ fontSize: 13, color: "rgba(0,0,0,0.4)" }}>클릭하거나 파일을 드래그하세요</span>
                  <span style={{ fontSize: 11, color: "rgba(0,0,0,0.28)" }}>이미지 없이 텍스트만도 가능</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef} type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {preview && (
              <button
                onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                style={{ marginTop: 6, fontSize: 12, color: "#ff3b30", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                이미지 제거
              </button>
            )}
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
            {isSubmitting ? "등록 중..." : "팝업 공지 등록"}
          </button>
        </div>

        {/* List */}
        <div className="sk-card" style={{ padding: "16px" }}>
          <p style={secHead}>등록된 팝업 ({items.length})</p>
          {items.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", textAlign: "center", padding: "16px 0" }}>등록된 팝업이 없습니다</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((a) => (
                <div
                  key={a.id}
                  style={{
                    borderRadius: 10, border: `1px solid ${a.is_active ? "rgba(255,149,0,0.3)" : "rgba(0,0,0,0.08)"}`,
                    overflow: "hidden", background: "#fff",
                    opacity: a.is_active ? 1 : 0.55,
                  }}
                >
                  {/* Image thumbnail */}
                  {a.image_url && (
                    <div style={{ background: "#000", maxHeight: 120, overflow: "hidden" }}>
                      <img src={a.image_url} alt="공지 이미지" style={{ width: "100%", height: "auto", maxHeight: 120, objectFit: "cover", display: "block" }} />
                    </div>
                  )}
                  {!a.image_url && (
                    <div style={{ height: 40, background: "rgba(0,0,0,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Image size={16} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.2)" }} />
                    </div>
                  )}

                  {/* Content */}
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f", margin: "0 0 3px" }}>{a.title}</p>
                        <p style={{ fontSize: 12, color: "rgba(0,0,0,0.5)", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {a.body}
                        </p>
                        <p style={{ fontSize: 11, color: "rgba(0,0,0,0.3)", margin: "4px 0 0" }}>
                          {new Date(a.created_at).toLocaleDateString("ko-KR")}
                          {a.is_active && <span style={{ marginLeft: 8, color: "#ff9500", fontWeight: 600 }}>● 노출 중</span>}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          onClick={() => handleToggle(a)}
                          title={a.is_active ? "비활성화" : "활성화"}
                          style={{ padding: 6, borderRadius: 6, border: "none", background: a.is_active ? "rgba(52,199,89,0.1)" : "rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          {a.is_active
                            ? <Eye size={14} strokeWidth={1.5} style={{ color: "#34c759" }} />
                            : <EyeOff size={14} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)" }} />
                          }
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          style={{ padding: 6, borderRadius: 6, border: "none", background: "rgba(255,59,48,0.07)", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} style={{ color: "#ff3b30" }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SQL setup */}
        <div style={{ background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.15)", borderRadius: 10, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0071e3", letterSpacing: "0.06em", marginBottom: 6 }}>SUPABASE 설정 안내</p>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.56)", lineHeight: 1.6 }}>
            SQL Editor에서 아래 쿼리 실행 후, Storage에서 <strong>announcements</strong> 버킷(공개)을 생성하세요.
          </p>
          <pre style={{ fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "8px 10px", marginTop: 8, overflowX: "auto", color: "#1d1d1f", lineHeight: 1.5 }}>
{`create table public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null default '',
  image_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "public_read" on public.announcements
  for select using (true);
create policy "service_all" on public.announcements
  for all using (auth.role() = 'service_role');`}
          </pre>
        </div>

      </div>
    </div>
  );
}
