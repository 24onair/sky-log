"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUser, signOut } from "@/lib/supabase/auth";
import { Wind, LogOut, BookOpen, Navigation, Plus } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    getUser().then(setUser);
  }, [pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  const isAuth = pathname?.startsWith("/auth");
  const onLogbook = pathname?.startsWith("/logbook");
  const onTasks = pathname?.startsWith("/tasks");

  const navLink = (href: string, icon: React.ReactNode, label: string, active: boolean) => (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? "#1d1d1f" : "rgba(0,0,0,0.56)",
        background: active ? "rgba(0,0,0,0.06)" : "none",
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
            style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", color: "#1d1d1f", flexShrink: 0 }}
          >
            <Wind size={17} strokeWidth={1.5} style={{ color: "var(--sk-accent)" }} />
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>Sky Log</span>
          </Link>

          {/* Center nav links (desktop) */}
          {user && !isAuth && (
            <div
              style={{ display: "flex", alignItems: "center", gap: 2 }}
              className="sk-desktop-nav"
            >
              {navLink("/logbook", <BookOpen size={13} strokeWidth={1.5} />, "로그북", !!onLogbook)}
              {navLink("/tasks", <Navigation size={13} strokeWidth={1.5} />, "타스크", !!onTasks)}
            </div>
          )}

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {user && !isAuth ? (
              <>
                {/* Quick add buttons — desktop only */}
                <div className="sk-desktop-nav" style={{ display: "flex", gap: 4 }}>
                  {onLogbook && (
                    <Link
                      href="/logbook/new"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 13, background: "var(--sk-accent)", color: "#fff", textDecoration: "none", fontWeight: 500 }}
                    >
                      <Plus size={13} strokeWidth={2} />새 비행
                    </Link>
                  )}
                  {onTasks && (
                    <Link
                      href="/tasks/new"
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 13, background: "var(--sk-accent)", color: "#fff", textDecoration: "none", fontWeight: 500 }}
                    >
                      <Plus size={13} strokeWidth={2} />새 타스크
                    </Link>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  title="로그아웃"
                  style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 8, fontSize: 13, color: "rgba(0,0,0,0.4)", background: "none", border: "none", cursor: "pointer" }}
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
          <MobileTab href="/logbook" icon={<BookOpen size={20} strokeWidth={1.5} />} label="로그북" active={!!onLogbook} />
          <MobileTab href="/tasks" icon={<Navigation size={20} strokeWidth={1.5} />} label="타스크" active={!!onTasks} />
          <MobileTab href="/logbook/new" icon={<Plus size={22} strokeWidth={2} />} label="새 비행" accent />
          <MobileTab href="/tasks/new" icon={<Navigation size={18} strokeWidth={1.5} />} label="새 타스크" />
        </div>
      )}
    </>
  );
}

function MobileTab({
  href, icon, label, active, accent,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        textDecoration: "none",
        color: accent ? "var(--sk-accent)" : active ? "#1d1d1f" : "rgba(0,0,0,0.4)",
        fontSize: 10,
        fontWeight: active || accent ? 600 : 400,
        transition: "color 0.15s",
      }}
    >
      <div style={{ color: accent ? "var(--sk-accent)" : active ? "#1d1d1f" : "rgba(0,0,0,0.36)", transition: "color 0.15s" }}>
        {icon}
      </div>
      {label}
    </Link>
  );
}
