"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUser, signOut } from "@/lib/supabase/auth";
import { hasUnsavedChanges, getUnsavedMessage } from "@/lib/unsavedChanges";
import { Wind, LogOut, BookOpen, Navigation, Plus, Shield, Users, MapPin, Layers } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [confirmNav, setConfirmNav] = useState<string | null>(null); // pending href

  useEffect(() => {
    getUser().then(setUser);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const ADMIN_EMAIL = "24onair@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isAuth = pathname?.startsWith("/auth");
  const onLogbook = pathname?.startsWith("/logbook");
  const onTasks = pathname?.startsWith("/tasks");
  const onWaypoints = pathname?.startsWith("/waypoints");
  const onAdmin = pathname?.startsWith("/admin");

  const navLink = (href: string, icon: React.ReactNode, label: string, active: boolean) => (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "8px 14px",
        borderRadius: 8,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        color: active ? "#F0B90B" : "#848E9C",
        background: active ? "rgba(240, 185, 11, 0.08)" : "none",
        textDecoration: "none",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <>
      {/* ── Top nav ─────────────────────────────────────────────────── */}
      <nav className="sk-nav">
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <Link
            href={user ? "/logbook" : "/"}
            style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#1E2026", flexShrink: 0, fontSize: 15, fontWeight: 600 }}
          >
            <Wind size={18} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
            <span style={{ letterSpacing: "-0.3px" }}>Sky Log</span>
          </Link>

          {/* Center nav links (desktop) */}
          {user && !isAuth && (
            <div
              style={{ display: "flex", alignItems: "center", gap: 4 }}
              className="sk-desktop-nav"
            >
              {navLink("/logbook", <BookOpen size={14} strokeWidth={1.5} />, "로그북", !!onLogbook)}
              {navLink("/tasks", <Navigation size={14} strokeWidth={1.5} />, "타스크", !!onTasks)}
              {navLink("/waypoints", <Layers size={14} strokeWidth={1.5} />, "웨이포인트", !!onWaypoints)}
              {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid rgba(0,0,0,0.1)" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.25)", letterSpacing: "0.06em", marginRight: 6, display: "flex", alignItems: "center", gap: 3 }}>
                    <Shield size={11} strokeWidth={2} />ADMIN
                  </span>
                  {navLink("/admin/tasks", <MapPin size={14} strokeWidth={1.5} />, "타스크관리", onAdmin && pathname?.startsWith("/admin/tasks"))}
                  {navLink("/admin/members", <Users size={14} strokeWidth={1.5} />, "회원관리", onAdmin && pathname?.startsWith("/admin/members"))}
                </div>
              )}
            </div>
          )}

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {user && !isAuth ? (
              <>
                {/* Quick add buttons — desktop only */}
                <div className="sk-desktop-nav" style={{ display: "flex", gap: 4 }}>
                  {onLogbook && (
                    <Link
                      href="/logbook/new"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 20, fontSize: 13, background: "#F0B90B", color: "#1E2026", textDecoration: "none", fontWeight: 600 }}
                    >
                      <Plus size={14} strokeWidth={2} />새 비행
                    </Link>
                  )}
                  {onTasks && (
                    <Link
                      href="/tasks/new"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 16px", borderRadius: 20, fontSize: 13, background: "#F0B90B", color: "#1E2026", textDecoration: "none", fontWeight: 600 }}
                    >
                      <Plus size={14} strokeWidth={2} />새 타스크
                    </Link>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  title="로그아웃"
                  style={{ display: "flex", alignItems: "center", padding: "6px 10px", borderRadius: 8, fontSize: 13, color: "#848E9C", background: "none", border: "none", cursor: "pointer" }}
                >
                  <LogOut size={15} strokeWidth={1.5} />
                </button>
              </>
            ) : !isAuth ? (
              <Link
                href="/auth/login"
                style={{ padding: "5px 16px", borderRadius: 980, fontSize: 13, color: "var(--sk-accent)", textDecoration: "none", border: "1px solid var(--sk-accent)" }}
              >
                로그인
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      {/* ── Mobile bottom tab bar ────────────────────────────────────── */}
      {user && !isAuth && (
        <div className="sk-mobile-tabs">
          <style>{`
            .sk-desktop-nav { display: flex; }
            .sk-mobile-tabs { display: none; }
            @media (max-width: 767px) {
              .sk-desktop-nav { display: none !important; }
              .sk-mobile-tabs {
                display: flex;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: rgba(255,255,255,0.92);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-top: 1px solid rgba(0,0,0,0.1);
                z-index: 100;
                padding-bottom: env(safe-area-inset-bottom);
              }
            }
          `}</style>
          <MobileTab href="/logbook" icon={<BookOpen size={20} strokeWidth={1.5} />} label="로그북" active={!!onLogbook} onNavigate={setConfirmNav} />
          <MobileTab href="/tasks" icon={<Navigation size={20} strokeWidth={1.5} />} label="타스크" active={!!onTasks} onNavigate={setConfirmNav} />
          <MobileTab href="/waypoints" icon={<Layers size={20} strokeWidth={1.5} />} label="웨이포인트" active={!!onWaypoints} onNavigate={setConfirmNav} />
          <MobileTab href="/logbook/new" icon={<Plus size={22} strokeWidth={2} />} label="새 비행" accent onNavigate={setConfirmNav} />
          <MobileTab href="/tasks/new" icon={<Navigation size={18} strokeWidth={1.5} />} label="새 타스크" onNavigate={setConfirmNav} />
          {isAdmin && (
            <MobileTab href="/admin" icon={<Shield size={18} strokeWidth={1.5} />} label="관리자" active={!!onAdmin} onNavigate={setConfirmNav} />
          )}
        </div>
      )}

      {/* ── Unsaved changes confirm modal ────────────────────────────── */}
      {confirmNav && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 80px" }}
          onClick={() => setConfirmNav(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 20, padding: "24px 20px", width: "calc(100% - 32px)", maxWidth: 400, boxShadow: "0 -4px 40px rgba(0,0,0,0.18)" }}
          >
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>페이지를 떠나시겠습니까?</p>
            <p style={{ fontSize: 14, color: "rgba(0,0,0,0.5)", lineHeight: 1.5, marginBottom: 24 }}>
              {getUnsavedMessage()}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setConfirmNav(null)}
                style={{ flex: 1, padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 500, background: "rgba(0,0,0,0.06)", color: "#1d1d1f", border: "none", cursor: "pointer" }}
              >
                취소
              </button>
              <button
                onClick={() => { router.push(confirmNav); setConfirmNav(null); }}
                style={{ flex: 1, padding: "13px", borderRadius: 12, fontSize: 15, fontWeight: 600, background: "#ff3b30", color: "#fff", border: "none", cursor: "pointer" }}
              >
                떠나기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MobileTab({
  href, icon, label, active, accent, onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  accent?: boolean;
  onNavigate: (href: string) => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (hasUnsavedChanges()) {
      onNavigate(href);
    } else {
      router.push(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        background: "none",
        border: "none",
        cursor: "pointer",
        color: accent ? "var(--sk-accent)" : active ? "#1d1d1f" : "rgba(0,0,0,0.4)",
        fontSize: 10,
        fontWeight: active || accent ? 600 : 400,
        transition: "color 0.15s",
        padding: "0",
      }}
    >
      <div style={{ color: accent ? "var(--sk-accent)" : active ? "#1d1d1f" : "rgba(0,0,0,0.36)", transition: "color 0.15s" }}>
        {icon}
      </div>
      {label}
    </button>
  );
}
