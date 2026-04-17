"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/supabase/auth";
import { CheckCircle } from "lucide-react";

const WING_GRADES = ["EN-A", "EN-B", "EN-C", "EN-D", "CCC"];

const fieldStyle = { display: "flex", flexDirection: "column" as const, gap: 8 };
const labelStyle = { fontSize: 14, fontWeight: 600, color: "#1E2026" } as React.CSSProperties;

export default function SignUpPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", passwordConfirm: "",
    name: "", phone: "", nickname: "",
    wing_brand: "", wing_name: "", wing_grade: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email) e.email = "이메일을 입력해주세요";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "올바른 이메일 형식이 아닙니다";
    if (!form.password) e.password = "비밀번호를 입력해주세요";
    else if (form.password.length < 6) e.password = "6자 이상 입력해주세요";
    if (form.password !== form.passwordConfirm) e.passwordConfirm = "비밀번호가 일치하지 않습니다";
    if (!form.name) e.name = "이름을 입력해주세요";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await signUp({ email: form.email, password: form.password, name: form.name, phone: form.phone, nickname: form.nickname, wing_brand: form.wing_brand, wing_name: form.wing_name, wing_grade: form.wing_grade });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "calc(100vh - 48px)", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="sk-card" style={{ padding: 56, maxWidth: 420, width: "100%", textAlign: "center" }}>
          <CheckCircle size={56} strokeWidth={1.5} style={{ color: "#34c759", margin: "0 auto 24px" }} />
          <h2 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 14, color: "#1E2026" }}>이메일을 확인해주세요</h2>
          <p style={{ fontSize: 15, color: "#848E9C", lineHeight: 1.6, marginBottom: 32, fontWeight: 500 }}>
            <strong style={{ color: "#1E2026" }}>{form.email}</strong>로 인증 링크를 보냈습니다.
          </p>
          <Link href="/auth/login" className="sk-btn-primary" style={{ display: "inline-flex", justifyContent: "center", padding: "12px 32px", fontSize: 15, fontWeight: 600 }}>
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#FFFFFF", padding: "56px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", color: "#1E2026", marginBottom: 10 }}>회원가입</h1>
          <p style={{ fontSize: 15, color: "#848E9C", fontWeight: 500 }}>Sky Log에 오신 걸 환영합니다</p>
        </div>

        <div className="sk-card" style={{ padding: "48px" }}>
          {error && (
            <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 28 }}>
              <p style={{ fontSize: 14, color: "#ff3b30", fontWeight: 500 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>

            {/* 계정 정보 */}
            <section>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#848E9C", textTransform: "uppercase", marginBottom: 16 }}>계정 정보</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>이메일 *</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" className={`sk-input${errors.email ? " error" : ""}`} disabled={isSubmitting} />
                  {errors.email && <p style={{ fontSize: 12, color: "#ff3b30", fontWeight: 500 }}>{errors.email}</p>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>비밀번호 *</label>
                    <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="6자 이상" className={`sk-input${errors.password ? " error" : ""}`} disabled={isSubmitting} />
                    {errors.password && <p style={{ fontSize: 12, color: "#ff3b30", fontWeight: 500 }}>{errors.password}</p>}
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>비밀번호 확인 *</label>
                    <input type="password" value={form.passwordConfirm} onChange={(e) => set("passwordConfirm", e.target.value)} placeholder="재입력" className={`sk-input${errors.passwordConfirm ? " error" : ""}`} disabled={isSubmitting} />
                    {errors.passwordConfirm && <p style={{ fontSize: 12, color: "#ff3b30", fontWeight: 500 }}>{errors.passwordConfirm}</p>}
                  </div>
                </div>
              </div>
            </section>

            {/* 개인 정보 */}
            <section>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#848E9C", textTransform: "uppercase", marginBottom: 16 }}>개인 정보</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>이름 *</label>
                  <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="홍길동" className={`sk-input${errors.name ? " error" : ""}`} disabled={isSubmitting} />
                  {errors.name && <p style={{ fontSize: 12, color: "#ff3b30", fontWeight: 500 }}>{errors.name}</p>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>닉네임</label>
                  <input type="text" value={form.nickname} onChange={(e) => set("nickname", e.target.value)} placeholder="활동명" className="sk-input" disabled={isSubmitting} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>전화번호</label>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-0000-0000" className="sk-input" disabled={isSubmitting} />
                </div>
              </div>
            </section>

            {/* 날개 정보 */}
            <section>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#848E9C", textTransform: "uppercase", marginBottom: 16 }}>날개 정보</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>브랜드</label>
                  <input type="text" value={form.wing_brand} onChange={(e) => set("wing_brand", e.target.value)} placeholder="Ozone, Advance..." className="sk-input" disabled={isSubmitting} />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>날개 이름</label>
                  <input type="text" value={form.wing_name} onChange={(e) => set("wing_name", e.target.value)} placeholder="Rush 6, Sigma 10..." className="sk-input" disabled={isSubmitting} />
                </div>
                <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>등급</label>
                  <select value={form.wing_grade} onChange={(e) => set("wing_grade", e.target.value)} className="sk-input" disabled={isSubmitting} style={{ cursor: "pointer" }}>
                    <option value="">선택</option>
                    {WING_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </section>

            <button type="submit" disabled={isSubmitting} className="sk-btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 16, fontWeight: 600, marginTop: 8, opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? "처리 중..." : "회원가입"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 14, color: "#848E9C", marginTop: 28, fontWeight: 500 }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" style={{ color: "#F0B90B", textDecoration: "none", fontWeight: 700 }}>로그인</Link>
        </p>
      </div>
    </div>
  );
}
