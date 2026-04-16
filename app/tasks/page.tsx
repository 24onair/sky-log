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
    <div style={{ background: "#f5f5f7", minHeight: "calc(100vh - 48px)", padding: "40px 20px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.5px", color: "#1d1d1f", lineHeight: 1.1 }}>타스크</h1>
            <p style={{ fontSize: 15, color: "rgba(0,0,0,0.48)", marginTop: 4 }}>XC 비행 태스크 플래너</p>
          </div>
          <Link
            href="/tasks/new"
            className="sk-btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, fontSize: 14 }}
          >
            <Plus size={15} strokeWidth={2} />
            새 타스크
          </Link>
        </div>

        {error && (
          <div style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ fontSize: 14, color: "#ff3b30" }}>{error}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 28, height: 28, border: "2px solid #0071e3", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {/* My tasks */}
            {myTasks.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", textTransform: "uppercase", marginBottom: 12 }}>내 타스크</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {myTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isOwner onDelete={() => handleDelete(task.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Public tasks from others */}
            {publicTasks.length > 0 && (
              <section>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,0,0,0.36)", textTransform: "uppercase", marginBottom: 12 }}>공개 타스크</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {publicTasks.map((task) => (
                    <TaskCard key={task.id} task={task} isOwner={false} />
                  ))}
                </div>
              </section>
            )}

            {myTasks.length === 0 && publicTasks.length === 0 && (
              <div style={{ textAlign: "center", padding: "80px 20px" }}>
                <div style={{ width: 56, height: 56, background: "rgba(0,113,227,0.08)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  <Navigation size={26} strokeWidth={1.5} style={{ color: "#0071e3" }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 600, color: "#1d1d1f", marginBottom: 8 }}>타스크가 없습니다</h3>
                <p style={{ fontSize: 14, color: "rgba(0,0,0,0.48)", marginBottom: 24 }}>첫 번째 XC 타스크를 만들어보세요</p>
                <Link href="/tasks/new" className="sk-btn-primary" style={{ display: "inline-flex", padding: "10px 24px", borderRadius: 980, fontSize: 14 }}>
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
      style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}
    >
      {/* Waypoint type dots */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {task.waypoints.slice(0, 5).map((wp, i) => (
          <div
            key={i}
            style={{ width: 8, height: 8, borderRadius: "50%", background: waypointColor(wp.type) }}
          />
        ))}
      </div>

      {/* Info */}
      <Link
        href={`/tasks/${task.id}`}
        style={{ flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {task.name}
          </p>
          {task.is_public
            ? <Globe size={11} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)", flexShrink: 0 }} />
            : <Lock size={11} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.3)", flexShrink: 0 }} />}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{task.task_date}</span>
          <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>{task.task_type}</span>
          {task.distance_km != null && (
            <span style={{ fontSize: 12, color: "#0071e3", fontWeight: 500 }}>
              {task.distance_km.toFixed(1)} km
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>
            WP {task.waypoints.length}개
          </span>
        </div>
      </Link>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {isOwner && onDelete && (
          <button
            onClick={onDelete}
            style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "rgba(0,0,0,0.28)", borderRadius: 6 }}
          >
            <Trash2 size={15} strokeWidth={1.5} />
          </button>
        )}
        <ChevronRight size={15} strokeWidth={1.5} style={{ color: "rgba(0,0,0,0.24)" }} />
      </div>
    </div>
  );
}
