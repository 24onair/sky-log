"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTasks, deleteTask } from "@/lib/supabase/tasks";
import { getUser } from "@/lib/supabase/auth";
import { Task } from "@/lib/schemas/task";
import { waypointColor } from "@/lib/utils/taskUtils";
import { Plus, Navigation, Trash2, Lock, Globe, ChevronRight } from "lucide-react";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const user = await getUser();
        if (!user) { router.push("/auth/login"); return; }
        setUserId(user.id);
        setTasks(await getTasks(user.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "불러오기 실패");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const handleDelete = async (taskId: string) => {
    if (!userId) return;
    if (!confirm("타스크를 삭제하시겠습니까?")) return;
    try {
      await deleteTask(userId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  const myTasks = tasks.filter((t) => t.user_id === userId);
  const publicTasks = tasks.filter((t) => t.user_id !== userId && t.is_public);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.5px", color: "#1E2026", lineHeight: 1.1 }}>타스크</h1>
            <p style={{ fontSize: 15, color: "#848E9C", marginTop: 6, fontWeight: 500 }}>XC 비행 태스크 플래너</p>
          </div>
          <Link
            href="/tasks/new"
            className="sk-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", fontSize: 15, fontWeight: 600 }}
          >
            <Plus size={16} strokeWidth={2} />
            새 타스크
          </Link>
        </div>

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "#ff3b30", fontWeight: 500 }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ width: 32, height: 32, border: "3px solid #F0B90B", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* My tasks */}
            {myTasks.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#848E9C", textTransform: "uppercase", marginBottom: 14 }}>내 타스크</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {myTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isOwner onDelete={() => handleDelete(task.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Public tasks from others */}
            {publicTasks.length > 0 && (
              <section>
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#848E9C", textTransform: "uppercase", marginBottom: 14 }}>공개 타스크</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {publicTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isOwner={false} />
                  ))}
                </div>
              </section>
            )}

            {myTasks.length === 0 && publicTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "100px 20px" }}>
                <div style={{ width: 64, height: 64, background: "rgba(240, 185, 11, 0.1)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
                  <Navigation size={32} strokeWidth={1.5} style={{ color: "#F0B90B" }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1E2026", marginBottom: 10 }}>타스크가 없습니다</h3>
                <p style={{ fontSize: 15, color: "#848E9C", marginBottom: 28, fontWeight: 500 }}>첫 번째 XC 타스크를 만들어보세요</p>
                <Link href="/tasks/new" className="sk-btn-primary" style={{ display: "inline-flex", padding: "12px 28px", fontSize: 15, fontWeight: 600 }}>
                  타스크 만들기
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isOwner, onDelete }: { task: Task; isOwner: boolean; onDelete?: () => void }) {
  return (
    <div
      className="sk-card"
      style={{ padding: "18px 24px", display: "flex", alignItems: "center", gap: 14 }}
    >
      {/* Waypoint type dots */}
      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
        {task.waypoints.slice(0, 5).map((wp, i) => (
          <div
            key={i}
            style={{ width: 9, height: 9, borderRadius: "50%", background: waypointColor(wp.type) }}
          />
        ))}
      </div>

      {/* Info */}
      <Link
        href={`/tasks/${task.id}`}
        style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#1E2026", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {task.name}
          </p>
          {task.is_public
            ? <Globe size={12} strokeWidth={1.5} style={{ color: "#848E9C", flexShrink: 0 }} />
            : <Lock size={12} strokeWidth={1.5} style={{ color: "#848E9C", flexShrink: 0 }} />}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <span style={{ fontSize: 13, color: "#848E9C", fontWeight: 500 }}>{task.task_date}</span>
          <span style={{ fontSize: 13, color: "#848E9C", fontWeight: 500 }}>{task.task_type}</span>
          {task.distance_km != null && (
            <span style={{ fontSize: 13, color: "#F0B90B", fontWeight: 600 }}>
              {task.distance_km.toFixed(1)} km
            </span>
          )}
          <span style={{ fontSize: 13, color: "#848E9C", fontWeight: 500 }}>
            WP {task.waypoints.length}개
          </span>
        </div>
      </Link>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            style={{ padding: 8, background: "none", border: "none", cursor: "pointer", color: "#848E9C", borderRadius: 6, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ff3b30")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#848E9C")}
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        )}
        <ChevronRight size={16} strokeWidth={1.5} style={{ color: "#D0D0D0" }} />
      </div>
    </div>
  );
}
