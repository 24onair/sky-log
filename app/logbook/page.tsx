"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFlightLogs, getFlightLogStats } from "@/lib/supabase/logbook";
import { getUser } from "@/lib/supabase/auth";
import { FlightLog } from "@/lib/schemas/logbook";
import { FlightLogCard } from "@/components/FlightLogCard";
import { StatisticsSummary } from "@/components/StatisticsSummary";
import { Plus, Wind } from "lucide-react";

type PeriodFilter = "all" | "year" | "month";
const FILTERS: { key: PeriodFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "year", label: "올해" },
  { key: "month", label: "이번 달" },
];

export default function LogbookPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<FlightLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("all");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = await getUser();
        if (!user) { router.push("/auth/login"); return; }

        let startDate: Date | undefined;
        let endDate: Date | undefined;
        const now = new Date();
        if (period === "year") {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear() + 1, 0, 1);
        } else if (period === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        const [logsData, statsData] = await Promise.all([
          getFlightLogs(user.id, { startDate, endDate, limit: 50 }),
          getFlightLogStats(user.id),
        ]);

        setLogs(logsData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [period, router]);

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.5px", color: "#1d1d1f", lineHeight: 1.1 }}>로그북</h1>
            <p style={{ fontSize: 15, color: "rgba(0,0,0,0.48)", marginTop: 4 }}>나의 XC 비행 기록</p>
          </div>
          <Link href="/logbook/new" className="sk-btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, fontSize: 14 }}>
            <Plus size={15} strokeWidth={2} />
            새 비행 기록
          </Link>
        </div>

        {/* Stats */}
        {stats && !loading && <StatisticsSummary stats={stats} />}

        {/* Period filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: "6px 16px",
                borderRadius: 980,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                background: period === key ? "#1d1d1f" : "#fff",
                color: period === key ? "#fff" : "rgba(0,0,0,0.56)",
                boxShadow: period === key ? "none" : "rgba(0,0,0,0.08) 0px 1px 6px 0px",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: "rgba(0,0,0,0.4)" }}>불러오는 중...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 56, height: 56, background: "rgba(0,113,227,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Wind size={26} strokeWidth={1.5} style={{ color: "#0071e3" }} />
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 600, color: "#1d1d1f", marginBottom: 8, letterSpacing: "-0.3px" }}>아직 비행 기록이 없습니다</h3>
            <p style={{ fontSize: 14, color: "rgba(0,0,0,0.48)", marginBottom: 24 }}>첫 번째 비행을 기록해보세요</p>
            <Link href="/logbook/new" className="sk-btn-primary" style={{ display: "inline-flex", padding: "10px 24px", borderRadius: 980, fontSize: 14 }}>
              첫 비행 기록하기
            </Link>
          </div>
        )}

        {/* Flight list */}
        {!loading && logs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {logs.map((log) => (
              <FlightLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
