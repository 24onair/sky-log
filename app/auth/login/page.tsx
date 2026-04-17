"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/supabase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "이메일을 입력해주세요";
    if (!form.password) e.password = "비밀번호를 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await signIn(form.email, form.password);
      router.push("/logbook");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", color: "#1E2026", marginBottom: 10 }}>로그인</h1>
          <p style={{ fontSize: 15, color: "#848E9C", fontWeight: 500 }}>Sky Log에 오신 걸 환영합니다</p>
        </div>

        <div className="sk-card" style={{ padding: 40 }}>
          {error && (
            <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: "#ff3b30", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1E2026", marginBottom: 8 }}>이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
                className={`sk-input${errors.email ? " error" : ""}`}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4, fontWeight: 500 }}>{errors.email}</p>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#1E2026", marginBottom: 8 }}>비밀번호</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="비밀번호 입력"
                className={`sk-input${errors.password ? " error" : ""}`}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              {errors.password && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4, fontWeight: 500 }}>{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="sk-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 16, fontWeight: 600, marginTop: 10, opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "#848E9C", marginTop: 24, fontWeight: 500 }}>
          계정이 없으신가요?{" "}
          <Link href="/auth/signup" style={{ color: "#F0B90B", textDecoration: "none", fontWeight: 700 }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
