"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createFlightLog } from "@/lib/supabase/logbook";
import { getUser } from "@/lib/supabase/auth";
import { FlightLogForm } from "@/components/FlightLogForm";
import { FlightLogInsert } from "@/lib/schemas/logbook";
import Link from "next/link";

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
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    setIsSubmitting(true);
    try {
      await createFlightLog(userId, data);
      router.push("/logbook");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <Link
            href="/logbook"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Logbook
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mt-4">New Flight</h1>
          <p className="text-gray-600 mt-1">
            Upload IGC file or manually enter your flight details
          </p>
        </div>

        {/* 폼 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <FlightLogForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            sites={[
              // TODO: 실제 sites 데이터 불러오기
              { id: "site-1", name: "Deo Bong" },
              { id: "site-2", name: "Soraesan" },
              { id: "site-3", name: "Cheonggyesan" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
