import Link from "next/link";
import { Wind, BarChart2, Upload, MapPin } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero — dark section inspired by Binance */}
      <section style={{ background: "#222126", color: "#fff", padding: "100px 20px 80px", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", color: "#F0B90B", textTransform: "uppercase", marginBottom: 16 }}>
            Paragliding Logbook
          </p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 600, lineHeight: 1.07, letterSpacing: "-0.5px", marginBottom: 20 }}>
            하늘의 기록을<br />한 곳에서
          </h1>
          <p style={{ fontSize: 19, fontWeight: 300, lineHeight: 1.47, color: "rgba(255,255,255,0.72)", marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
            IGC 파일을 올리거나 직접 입력해 비행 데이터를 기록하고 통계를 확인하세요.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/signup" className="sk-btn-primary" style={{ padding: "14px 40px", fontSize: 16, fontWeight: 600 }}>
              무료로 시작하기
            </Link>
            <Link href="/auth/login" style={{ padding: "14px 40px", fontSize: 16, fontWeight: 600, color: "#F0B90B", textDecoration: "none", border: "2px solid #F0B90B", borderRadius: 50, display: "inline-flex", alignItems: "center", fontWeight: 600, background: "transparent" }}>
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* Features — light section */}
      <section style={{ background: "#FFFFFF", padding: "80px 20px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.5px", textAlign: "center", marginBottom: 60, color: "#1E2026" }}>
            비행을 더 깊이 이해하세요
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { icon: Upload, title: "IGC 자동 파싱", desc: "비행 기록기에서 내보낸 IGC 파일을 업로드하면 비행 시간, 고도, 거리를 자동으로 추출합니다." },
              { icon: BarChart2, title: "비행 통계", desc: "총 비행 시간, 최장 비행, 최고 고도 등 누적 통계를 한눈에 확인합니다." },
              { icon: MapPin, title: "이륙장 관리", desc: "자주 이용하는 이륙장 정보를 저장하고 비행 기록과 연결합니다." },
              { icon: Wind, title: "날씨 기록", desc: "풍향, 풍속, 날씨 상태를 함께 기록해 비행 조건 패턴을 분석합니다." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="sk-card" style={{ padding: 32 }}>
                <div style={{ width: 48, height: 48, background: "rgba(240, 185, 11, 0.1)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Icon size={24} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8, color: "#1E2026", letterSpacing: "-0.3px" }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.57, color: "#848E9C", letterSpacing: "-0.1px" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark section */}
      <section style={{ background: "#000", color: "#fff", padding: "80px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.5px", marginBottom: 16 }}>
            지금 바로 기록을 시작하세요
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", marginBottom: 36, lineHeight: 1.47 }}>
            무료로 가입하고 첫 번째 비행을 기록해보세요.
          </p>
          <Link href="/auth/signup" className="sk-btn-primary" style={{ padding: "12px 32px", fontSize: 17, borderRadius: 980 }}>
            무료 가입
          </Link>
        </div>
      </section>
    </div>
  );
}
