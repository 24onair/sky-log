"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/supabase/auth";

const WING_GRADES = ["EN-A", "EN-B", "EN-C", "EN-D", "CCC"];

export default function SignUpPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    name: "",
    phone: "",
    nickname: "",
    wing_brand: "",
    wing_name: "",
    wing_grade: "",
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
    else if (form.password.length < 6) e.password = "비밀번호는 6자 이상이어야 합니다";
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
      await signUp({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        nickname: form.nickname,
        wing_brand: form.wing_brand,
        wing_name: form.wing_name,
        wing_grade: form.wing_grade,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">이메일을 확인해주세요</h2>
          <p className="text-gray-600 mb-6">
            <span className="font-medium text-gray-900">{form.email}</span>로<br />
            인증 링크를 보냈습니다. 이메일을 확인 후 로그인해주세요.
          </p>
          <Link
            href="/auth/login"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors"
          >
            로그인 페이지로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">회원가입</h1>
          <p className="text-gray-500 mt-1">Sky Log에 오신 걸 환영합니다</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 계정 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">계정 정보</legend>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="email@example.com"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? "border-red-400" : "border-gray-300"}`}
                disabled={isSubmitting}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="6자 이상"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? "border-red-400" : "border-gray-300"}`}
                disabled={isSubmitting}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인 *</label>
              <input
                type="password"
                value={form.passwordConfirm}
                onChange={(e) => set("passwordConfirm", e.target.value)}
                placeholder="비밀번호 재입력"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.passwordConfirm ? "border-red-400" : "border-gray-300"}`}
                disabled={isSubmitting}
              />
              {errors.passwordConfirm && <p className="text-red-500 text-xs mt-1">{errors.passwordConfirm}</p>}
            </div>
          </fieldset>

          {/* 개인 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">개인 정보</legend>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="홍길동"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? "border-red-400" : "border-gray-300"}`}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) => set("nickname", e.target.value)}
                placeholder="활동명"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </fieldset>

          {/* 날개 정보 */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">날개 정보</legend>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날개 브랜드</label>
              <input
                type="text"
                value={form.wing_brand}
                onChange={(e) => set("wing_brand", e.target.value)}
                placeholder="Ozone, Advance, Nova 등"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날개 이름</label>
              <input
                type="text"
                value={form.wing_name}
                onChange={(e) => set("wing_name", e.target.value)}
                placeholder="Rush 6, Sigma 10 등"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날개 등급</label>
              <select
                value={form.wing_grade}
                onChange={(e) => set("wing_grade", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={isSubmitting}
              >
                <option value="">선택</option>
                {WING_GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-xl transition-colors mt-2"
          >
            {isSubmitting ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
