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
    <div style={{ minHeight: "calc(100vh - 48px)", background: "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", color: "#1d1d1f", marginBottom: 8 }}>로그인</h1>
          <p style={{ fontSize: 15, color: "rgba(0,0,0,0.56)" }}>Sky Log에 오신 걸 환영합니다</p>
        </div>

        <div className="sk-card" style={{ padding: 36 }}>
          {error && (
            <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1d1d1f", marginBottom: 6 }}>이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
                className={`sk-input${errors.email ? " error" : ""}`}
                disabled={isSubmitting}
                autoComplete="email"
              />
              {errors.email && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4 }}>{errors.email}</p>}
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#1d1d1f", marginBottom: 6 }}>비밀번호</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="비밀번호 입력"
                className={`sk-input${errors.password ? " error" : ""}`}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              {errors.password && <p style={{ fontSize: 12, color: "#ff3b30", marginTop: 4 }}>{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="sk-btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, marginTop: 8, borderRadius: 10, opacity: isSubmitting ? 0.6 : 1 }}
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "rgba(0,0,0,0.56)", marginTop: 20 }}>
          계정이 없으신가요?{" "}
          <Link href="/auth/signup" style={{ color: "#0066cc", textDecoration: "none", fontWeight: 500 }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
