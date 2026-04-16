"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getFlightLogs, getFlightLogStats } from "@/lib/supabase/logbook";
import { getUser, signOut } from "@/lib/supabase/auth";
import { FlightLog } from "@/lib/schemas/logbook";
import { FlightLogCard } from "@/components/FlightLogCard";
import { StatisticsSummary } from "@/components/StatisticsSummary";

type PeriodFilter = "all" | "year" | "month";

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
        if (!user) {
          router.push("/auth/login");
          return;
        }
        // 필터 계산
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
        setError(err instanceof Error ? err.message : "Failed to load flight logs");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Logbook</h1>
            <p className="text-gray-600 mt-1">Track your XC flights</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/logbook/new"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + New Flight
            </Link>
            <button
              onClick={async () => {
                await signOut();
                router.push("/auth/login");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 통계 */}
        {stats && !loading && (
          <StatisticsSummary stats={stats} />
        )}

        {/* 필터 */}
        <div className="flex gap-3 mb-6">
          {(["all", "year", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p === "all" && "All Time"}
              {p === "year" && "This Year"}
              {p === "month" && "This Month"}
            </button>
          ))}
        </div>

        {/* 에러 */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading flights...</p>
          </div>
        )}

        {/* 로그 목록 */}
        {!loading && logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No flights recorded yet</p>
            <Link
              href="/logbook/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Add Your First Flight
            </Link>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <FlightLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
