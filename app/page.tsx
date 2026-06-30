import Link from "next/link";
import { Route, Share2, LineChart, ArrowRight } from "lucide-react";

/* ── Soarline brand palette ───────────────────────────────────────── */
const NIGHT = "#0E2238";
const BLUE = "#2F77C2";
const CORAL = "#FF7A45";
const CYAN = "#74C6EC";
const PAPER = "#F5F2EC";
const SLATE = "#46535F";

/* 상승하는 라인이 정점에서 솟구치고, 코랄 점은 턴포인트(비행하는 파일럿) */
function SoarMark({ size = 32, stroke = NIGHT }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 25 L13 15 L19 19 L28 7" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="7" r="3.3" fill={CORAL} />
    </svg>
  );
}

export default function Home() {
  return (
    <div style={{ background: "#fff" }}>
      {/* ── Hero — Night Ink ───────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          background: NIGHT,
          color: "#fff",
          padding: "108px 20px 96px",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* ambient glows */}
        <div style={{ position: "absolute", top: -120, right: -80, width: 420, height: 420, background: "radial-gradient(circle, rgba(116,198,236,0.18), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -140, left: -100, width: 460, height: 460, background: "radial-gradient(circle, rgba(255,122,69,0.14), transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <SoarMark size={30} stroke={CYAN} />
            <span className="so-display" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.2px" }}>Soarline</span>
          </div>

          <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.16em", color: CYAN, textTransform: "uppercase", marginBottom: 20 }}>
            Paragliding · Task &amp; Logbook
          </p>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 62px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px", margin: "0 0 18px" }}>
            하늘에 라인을 긋다
          </h1>

          <p className="so-display" style={{ fontSize: "clamp(17px, 2.4vw, 22px)", fontWeight: 500, color: CORAL, marginBottom: 26, letterSpacing: "-0.2px" }}>
            Draw your line in the sky.
          </p>

          <p style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", maxWidth: 540, margin: "0 auto 40px" }}>
            웨이포인트 없이도 자유롭게 비행 타스크를 그리고, 저장하고, 공유하세요.
            그리고 당신의 모든 비행을 한 곳에 기록합니다.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auth/signup" className="sk-btn-primary" style={{ padding: "14px 36px", fontSize: 16 }}>
              무료로 시작하기 <ArrowRight size={17} strokeWidth={2} />
            </Link>
            <Link
              href="/auth/login"
              style={{ padding: "14px 36px", fontSize: 16, fontWeight: 600, color: "#fff", textDecoration: "none", border: "1.5px solid rgba(255,255,255,0.28)", borderRadius: 50, display: "inline-flex", alignItems: "center", background: "transparent" }}
            >
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* ── What it does — Paper ───────────────────────────────────── */}
      <section style={{ background: PAPER, padding: "88px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: SLATE, textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
            무엇을 하는 서비스인가
          </p>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.6px", textAlign: "center", color: NIGHT, margin: "0 auto 56px", maxWidth: 640 }}>
            타스크를 그리고, 남기고, 나눈다.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { icon: Route, tint: BLUE, title: "자유로운 타스크 작성", desc: "정해진 웨이포인트가 없어도 괜찮습니다. 손이 가는 대로 라인을 그어 나만의 비행 코스를 설계하세요." },
              { icon: Share2, tint: CORAL, title: "저장 & 공유", desc: "만든 타스크를 안전하게 보관하고, 링크 한 번으로 동료 파일럿과 코스를 공유합니다." },
              { icon: LineChart, tint: "#1f9e8f", title: "개인 비행 로그", desc: "IGC 업로드와 직접 입력으로 비행 시간·고도·거리를 기록하고 누적 통계를 확인합니다." },
            ].map(({ icon: Icon, tint, title, desc }) => (
              <div key={title} className="sk-card" style={{ padding: 30, background: "#fff" }}>
                <div style={{ width: 50, height: 50, borderRadius: 13, background: `${tint}1a`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                  <Icon size={24} strokeWidth={1.8} style={{ color: tint }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 10, color: NIGHT, letterSpacing: "-0.3px" }}>{title}</h3>
                <p style={{ fontSize: 15, lineHeight: 1.65, color: SLATE, letterSpacing: "-0.1px" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4 steps — White ────────────────────────────────────────── */}
      <section style={{ background: "#fff", padding: "88px 20px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", color: SLATE, textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
            4단계로 시작하기
          </p>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, lineHeight: 1.18, letterSpacing: "-0.6px", textAlign: "center", color: NIGHT, margin: "0 0 56px" }}>
            가입에서 첫 비행 기록까지
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 28 }}>
            {[
              { n: "01", title: "가입하고 시작", desc: "무료로 가입해 첫 비행 또는 첫 타스크를 만들 준비를 합니다." },
              { n: "02", title: "타스크 그리기", desc: "지도 위에 자유롭게 라인을 긋습니다. 웨이포인트는 선택, 자유 작성도 가능합니다." },
              { n: "03", title: "저장 & 공유", desc: "타스크를 저장하고 링크로 동료에게 공유하거나 함께 비행할 코스를 정합니다." },
              { n: "04", title: "비행 로그 기록", desc: "IGC 파일을 올리거나 직접 입력해 비행을 남기고 누적 통계를 확인합니다." },
            ].map(({ n, title, desc }) => (
              <div key={n}>
                <p className="so-display" style={{ fontSize: 40, fontWeight: 700, color: BLUE, lineHeight: 1, letterSpacing: "-1px" }}>{n}</p>
                <div style={{ width: 28, height: 3, background: CORAL, borderRadius: 2, margin: "14px 0 16px" }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: NIGHT, letterSpacing: "-0.3px" }}>{title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: SLATE }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA — Night Ink ────────────────────────────────────────── */}
      <section style={{ background: NIGHT, color: "#fff", padding: "92px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(26px, 4.4vw, 40px)", fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.6px", margin: "0 0 18px" }}>
            그어라, 너의 <span style={{ color: CORAL }}>라인</span>.<br />
            나머지는 우리가 기록한다.
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.6)", marginBottom: 36, lineHeight: 1.5 }}>
            지금 무료로 가입하고 첫 라인을 그어보세요.
          </p>
          <Link href="/auth/signup" className="sk-btn-primary" style={{ padding: "14px 40px", fontSize: 17 }}>
            무료로 시작하기 <ArrowRight size={18} strokeWidth={2} />
          </Link>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 56, opacity: 0.65 }}>
            <SoarMark size={20} stroke={CYAN} />
            <span className="so-display" style={{ fontSize: 14, fontWeight: 500 }}>Soarline · Draw your line in the sky.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
