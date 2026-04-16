"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFlightLog } from "@/lib/supabase/logbook";
import { getUser } from "@/lib/supabase/auth";
import { FlightLogForm } from "@/components/FlightLogForm";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewFlightPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getUser().then((user) => {
      if (!user) router.push("/auth/login");
      else setUserId(user.id);
    });
  }, [router]);

  const handleSubmit = async (data: FlightLogInsert) => {
    if (!userId) { router.push("/auth/login"); return; }
    setIsSubmitting(true);
    try {
      await createFlightLog(userId, data);
      router.push("/logbook");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Back */}
        <Link href="/logbook" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14, color: "#0066cc", textDecoration: "none", marginBottom: 24 }}>
          <ChevronLeft size={16} strokeWidth={1.5} />
          로그북으로
        </Link>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.5px", color: "#1d1d1f" }}>새 비행 기록</h1>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.48)", marginTop: 4 }}>IGC 파일을 올리거나 직접 입력하세요</p>
        </div>

        <div className="sk-card" style={{ padding: 32 }}>
          <FlightLogForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
