"use client";

import { supabase } from "@/lib/supabase";
import { Calendar, Plus, Settings, Trash2, Users } from "lucide-react";
import { useEffect, useState } from "react";

type OperatingHour = {
  id?: string;
  date: string;
  start_time: string;
  end_time: string;
};

type AdvisorProfile = {
  id: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  role: string;
};

type AdminTab = "hours" | "advisors";

export default function AdminDashboard({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("hours");
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [newHour, setNewHour] = useState<OperatingHour>({
    date: "",
    start_time: "10:00",
    end_time: "18:00",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  const loadHours = async () => {
    const { data } = await supabase
      .from("operating_hours")
      .select("*")
      .order("date");
    if (data) setHours(data as OperatingHour[]);
  };

  const loadAdvisors = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "advisor");
    if (data) setAdvisors(data as AdvisorProfile[]);
  };

  useEffect(() => {
    void (async () => {
      await loadHours();
      await loadAdvisors();
    })();
  }, []);

  const addHour = async () => {
    if (!newHour.date) return alert("日付を入力してください");
    setLoading(true);
    const { error } = await supabase.from("operating_hours").insert([newHour]);
    if (error) alert(error.message);
    else {
      setNewHour({ date: "", start_time: "10:00", end_time: "18:00" });
      loadHours();
    }
    setLoading(false);
  };

  const removeHour = async (id: string) => {
    await supabase.from("operating_hours").delete().eq("id", id);
    loadHours();
  };

  const inviteAdvisor = async () => {
    if (!inviteEmail) return alert("メールアドレスを入力してください");
    setLoading(true);

    try {
      // 招待テーブルにメールアドレスを追加
      const { error } = await supabase
        .from("invitations")
        .insert([{ email: inviteEmail, role: "advisor" }]);

      if (error) {
        if (error.code === "23505") {
          alert("このメールアドレスは既に招待されています。");
        } else {
          throw error;
        }
      } else {
        alert(
          `${inviteEmail} を担当者として招待しました。\n担当者の方はこのメールアドレスで新規登録を行ってください。`,
        );
        setInviteEmail("");
        setInvitePassword("");
      }
    } catch (error: unknown) {
      console.error(error);
      const msg =
        error instanceof Error ? error.message : "エラーが発生しました。";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-root">
      <nav className="admin-sidebar">
        <div className="admin-brand">
          <Settings size={24} color="var(--primary)" />
          <span>運営管理</span>
        </div>
        <div className="admin-nav">
          <button
            className={`admin-nav-item ${tab === "hours" ? "active" : ""}`}
            onClick={() => setTab("hours")}
          >
            <Calendar size={18} /> 予約可能日設定
          </button>
          <button
            className={`admin-nav-item ${tab === "advisors" ? "active" : ""}`}
            onClick={() => setTab("advisors")}
          >
            <Users size={18} /> 担当者管理
          </button>
        </div>
        <button className="signout-btn" onClick={onSignOut}>
          ログアウト
        </button>
      </nav>

      <main className="admin-main">
        {tab === "hours" && (
          <div>
            <h1 className="admin-title">予約可能日・時間の設定</h1>
            <p className="admin-subtitle">
              受講者が予約できる日と時間帯を設定します。
            </p>

            <div className="admin-card">
              <h3>新しい営業日を追加</h3>
              <div className="add-hour-form">
                <div className="form-group">
                  <label>日付</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newHour.date}
                    onChange={(e) =>
                      setNewHour({ ...newHour, date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>開始時間</label>
                  <input
                    type="time"
                    className="input-field"
                    value={newHour.start_time}
                    onChange={(e) =>
                      setNewHour({ ...newHour, start_time: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>終了時間</label>
                  <input
                    type="time"
                    className="input-field"
                    value={newHour.end_time}
                    onChange={(e) =>
                      setNewHour({ ...newHour, end_time: e.target.value })
                    }
                  />
                </div>
                <button
                  className="primary-btn"
                  onClick={addHour}
                  disabled={loading}
                >
                  <Plus size={16} /> 追加
                </button>
              </div>
            </div>

            <div className="admin-card">
              <h3>登録済み営業日</h3>
              {hours.length === 0 ? (
                <p className="empty-hint">まだ営業日が設定されていません。</p>
              ) : (
                <div className="hours-list">
                  {hours.map((h) => (
                    <div key={h.id} className="hour-row">
                      <span className="hour-date">{h.date}</span>
                      <span className="hour-time">
                        {h.start_time} 〜 {h.end_time}
                      </span>
                      <button
                        className="delete-btn"
                        onClick={() => removeHour(h.id!)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "advisors" && (
          <div>
            <h1 className="admin-title">担当者アカウント管理</h1>
            <p className="admin-subtitle">
              担当者（アドバイザー）のアカウントを発行・管理します。
            </p>

            <div className="admin-card">
              <h3>新しい担当者を追加</h3>
              <div className="invite-form">
                <div className="form-group">
                  <label>メールアドレス</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="advisor@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>初期パスワード</label>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="初期パスワードを設定"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>
                <button
                  className="primary-btn"
                  onClick={inviteAdvisor}
                  disabled={loading}
                >
                  <Plus size={16} /> 担当者を招待
                </button>
              </div>
            </div>

            <div className="admin-card">
              <h3>現在の担当者一覧</h3>
              {advisors.length === 0 ? (
                <p className="empty-hint">担当者はまだ登録されていません。</p>
              ) : (
                <div className="advisor-list">
                  {advisors.map((a) => (
                    <div key={a.id} className="advisor-row">
                      <div className="advisor-avatar">
                        {a.display_name?.[0] || "?"}
                      </div>
                      <div className="advisor-info">
                        <strong>{a.display_name || "(名前未設定)"}</strong>
                        <span>{a.bio || "自己紹介なし"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-root {
          display: flex;
          min-height: 100vh;
          background: #f0f4f8;
        }
        .admin-sidebar {
          width: 240px;
          background: white;
          border-right: 1px solid #e2e8f0;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: sticky;
          top: 0;
          height: 100vh;
        }
        .admin-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1rem;
          margin-bottom: 24px;
          color: var(--secondary);
        }
        .admin-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--text-dim);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .admin-nav-item:hover {
          background: var(--bg-soft);
          color: var(--primary);
        }
        .admin-nav-item.active {
          background: var(--primary-soft);
          color: var(--primary);
        }
        .signout-btn {
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 8px;
          text-align: left;
        }
        .admin-main {
          flex: 1;
          padding: 40px;
          max-width: 800px;
        }
        .admin-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--secondary);
          margin-bottom: 4px;
        }
        .admin-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 32px;
        }
        .admin-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .admin-card h3 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 20px;
          color: var(--secondary);
        }
        .add-hour-form,
        .invite-form {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          min-width: 140px;
        }
        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .hours-list,
        .advisor-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hour-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .hour-date {
          font-weight: 700;
          min-width: 120px;
        }
        .hour-time {
          color: var(--text-dim);
          flex: 1;
        }
        .delete-btn {
          border: none;
          background: transparent;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
        }
        .advisor-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        .advisor-avatar {
          width: 40px;
          height: 40px;
          background: var(--primary-soft);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .advisor-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .advisor-info span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .empty-hint {
          color: var(--text-muted);
          font-size: 0.9rem;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
