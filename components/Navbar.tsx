"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUser, signOut } from "@/lib/supabase/auth";
import { Wind, LogOut, Plus, BookOpen } from "lucide-react";

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

  return (
    <nav className="sk-nav">
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <Link href={user ? "/logbook" : "/"} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#1d1d1f" }}>
          <Wind size={18} strokeWidth={1.5} style={{ color: "var(--sk-accent)" }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.3px" }}>Sky Log</span>
        </Link>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {user && !isAuth ? (
            <>
              <Link href="/logbook" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 13, color: "rgba(0,0,0,0.7)", textDecoration: "none", fontWeight: 400 }}>
                <BookOpen size={14} strokeWidth={1.5} />
                로그북
              </Link>
              <Link href="/logbook/new" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 13, background: "var(--sk-accent)", color: "#fff", textDecoration: "none", fontWeight: 400 }}>
                <Plus size={14} strokeWidth={2} />
                새 비행
              </Link>
              <button
                onClick={handleSignOut}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 13, color: "rgba(0,0,0,0.5)", background: "none", border: "none", cursor: "pointer" }}
              >
                <LogOut size={14} strokeWidth={1.5} />
              </button>
            </>
          ) : !isAuth ? (
            <>
              <Link href="/auth/login" style={{ padding: "6px 16px", borderRadius: 980, fontSize: 13, color: "var(--sk-accent)", textDecoration: "none", border: "1px solid var(--sk-accent)" }}>
                로그인
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
