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
    <div style={{ background: "#FFFFFF", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.5px", color: "#1E2026", lineHeight: 1.1 }}>로그북</h1>
            <p style={{ fontSize: 15, color: "#848E9C", marginTop: 6, fontWeight: 500 }}>나의 XC 비행 기록</p>
          </div>
          <Link href="/logbook/new" className="sk-btn-primary" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", fontSize: 15, fontWeight: 600 }}>
            <Plus size={16} strokeWidth={2} />
            새 비행 기록
          </Link>
        </div>

        {/* Stats */}
        {stats && !loading && <StatisticsSummary stats={stats} />}

        {/* Period filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                padding: "10px 20px",
                borderRadius: 50,
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: period === key ? "#F0B90B" : "transparent",
                color: period === key ? "#1E2026" : "#848E9C",
                boxShadow: "none",
                transition: "all 0.2s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "#ff3b30", fontWeight: 500 }}>{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #F0B90B", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, color: "#848E9C", fontWeight: 500 }}>불러오는 중...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "100px 20px" }}>
            <div style={{ width: 64, height: 64, background: "rgba(240, 185, 11, 0.1)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <Wind size={32} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1E2026", marginBottom: 10, letterSpacing: "-0.3px" }}>아직 비행 기록이 없습니다</h3>
            <p style={{ fontSize: 15, color: "#848E9C", marginBottom: 28, fontWeight: 500 }}>첫 번째 비행을 기록해보세요</p>
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
