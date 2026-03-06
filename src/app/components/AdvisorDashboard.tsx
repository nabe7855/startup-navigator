"use client";

import { supabase } from "@/lib/supabase";
import { BookOpen, Calendar, MessageSquare, Save, User } from "lucide-react";
import { useEffect, useState } from "react";

type AdvisorTab = "profile" | "schedule" | "bookings";

type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  user_id: string;
  user_email?: string;
  plan_id?: string;
};

type Comment = {
  id: string;
  comment_text: string;
  created_at: string;
  advisor_name?: string;
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function AdvisorDashboard({
  userId,
  onSignOut,
}: {
  userId: string;
  onSignOut: () => void;
}) {
  const [tab, setTab] = useState<AdvisorTab>("bookings");
  const [profile, setProfile] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
  });
  const [schedules, setSchedules] = useState<
    Record<number, { start: string; end: string; enabled: boolean }>
  >({
    0: { start: "10:00", end: "17:00", enabled: false },
    1: { start: "10:00", end: "17:00", enabled: true },
    2: { start: "10:00", end: "17:00", enabled: true },
    3: { start: "10:00", end: "17:00", enabled: true },
    4: { start: "10:00", end: "17:00", enabled: true },
    5: { start: "10:00", end: "17:00", enabled: true },
    6: { start: "10:00", end: "17:00", enabled: false },
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [planData, setPlanData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data)
      setProfile({
        display_name: data.display_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
  };

  const loadSchedules = async () => {
    const { data } = await supabase
      .from("advisor_schedules")
      .select("*")
      .eq("advisor_id", userId);
    if (data && data.length > 0) {
      const map: typeof schedules = { ...schedules };
      data.forEach((s) => {
        map[s.day_of_week] = {
          start: s.start_time,
          end: s.end_time,
          enabled: true,
        };
      });
      setSchedules(map);
    }
  };

  const loadBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("advisor_id", userId)
      .order("booking_date", { ascending: true });
    if (data) setBookings(data as Booking[]);
  };

  useEffect(() => {
    void (async () => {
      await loadProfile();
      await loadSchedules();
      await loadBookings();
    })();
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("id", userId);
    if (error) alert(error.message);
    else alert("プロフィールを保存しました。");
    setSaving(false);
  };

  const saveSchedules = async () => {
    setSaving(true);
    // Delete existing and re-insert
    await supabase.from("advisor_schedules").delete().eq("advisor_id", userId);
    const rows = Object.entries(schedules)
      .filter(([, v]) => v.enabled)
      .map(([day, v]) => ({
        advisor_id: userId,
        day_of_week: Number(day),
        start_time: v.start,
        end_time: v.end,
      }));
    if (rows.length > 0) {
      const { error } = await supabase.from("advisor_schedules").insert(rows);
      if (error) alert(error.message);
      else alert("シフトを保存しました。");
    } else {
      alert("シフトを保存しました（すべての曜日が無効）。");
    }
    setSaving(false);
  };

  const openPlan = async (booking: Booking) => {
    setSelectedBooking(booking);
    // Load business plan for the user
    const { data: plans } = await supabase
      .from("business_plans")
      .select("*")
      .eq("user_id", booking.user_id)
      .limit(1)
      .single();
    if (plans) {
      setPlanData(plans.plan_data as Record<string, unknown>);
      // Load comments
      const { data: comms } = await supabase
        .from("plan_comments")
        .select("*, profiles(display_name)")
        .eq("plan_id", plans.id)
        .order("created_at");
      if (comms) {
        setComments(
          comms.map((c) => ({
            id: c.id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            advisor_name:
              (c.profiles as { display_name: string } | null)?.display_name ||
              "担当者",
          })),
        );
      }
    } else {
      setPlanData(null);
      setComments([]);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || !selectedBooking || !planData) return;
    // Find plan id
    const { data: plans } = await supabase
      .from("business_plans")
      .select("id")
      .eq("user_id", selectedBooking.user_id)
      .limit(1)
      .single();
    if (!plans) return alert("事業計画書が見つかりません。");
    const { error } = await supabase.from("plan_comments").insert([
      {
        plan_id: plans.id,
        advisor_id: userId,
        comment_text: newComment,
      },
    ]);
    if (error) alert(error.message);
    else {
      setNewComment("");
      openPlan(selectedBooking);
    }
  };

  if (selectedBooking) {
    return (
      <div className="plan-viewer">
        <div className="plan-header">
          <button
            className="back-btn"
            onClick={() => {
              setSelectedBooking(null);
              setPlanData(null);
            }}
          >
            ← 一覧に戻る
          </button>
          <h2>
            事業計画書 — {selectedBooking.booking_date}{" "}
            {selectedBooking.start_time}
          </h2>
        </div>
        <div className="plan-layout">
          <div className="plan-content glass-card">
            {!planData ? (
              <p className="empty-hint">
                この受講者はまだ事業計画書を提出していません。
              </p>
            ) : (
              <div className="plan-sections">
                {!!planData.name_full && (
                  <div className="plan-field">
                    <span className="plan-label">氏名</span>
                    <p>{String(planData.name_full)}</p>
                  </div>
                )}
                {!!planData.motivation && (
                  <div className="plan-field">
                    <span className="plan-label">1. 創業の動機</span>
                    <p>{String(planData.motivation)}</p>
                  </div>
                )}
                {!!planData.service_main && (
                  <div className="plan-field">
                    <span className="plan-label">3. 事業内容</span>
                    <p>{String(planData.service_main)}</p>
                  </div>
                )}
                {!!planData.service_strength && (
                  <div className="plan-field">
                    <span className="plan-label">セールスポイント</span>
                    <p>{String(planData.service_strength)}</p>
                  </div>
                )}
                {!!planData.service_strategy && (
                  <div className="plan-field">
                    <span className="plan-label">販売ターゲット・戦略</span>
                    <p>{String(planData.service_strategy)}</p>
                  </div>
                )}
                {!!planData.other_requests && (
                  <div className="plan-field">
                    <span className="plan-label">8. その他・相談事項</span>
                    <p>{String(planData.other_requests)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="comment-panel glass-card">
            <h3>コメント履歴</h3>
            <div className="comment-list">
              {comments.length === 0 ? (
                <p className="empty-hint">まだコメントはありません。</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="comment-bubble">
                    <div className="comment-meta">
                      <span className="comment-author">{c.advisor_name}</span>
                      <span className="comment-time">
                        {new Date(c.created_at).toLocaleString("ja-JP")}
                      </span>
                    </div>
                    <p className="comment-text">{c.comment_text}</p>
                  </div>
                ))
              )}
            </div>
            <div className="comment-input-area">
              <textarea
                className="input-field"
                rows={3}
                placeholder="アドバイス・フィードバックを入力..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="primary-btn" onClick={postComment}>
                <MessageSquare size={16} /> コメントを送信
              </button>
            </div>
          </div>
        </div>
        <style jsx>{`
          .plan-viewer {
            padding: 24px;
            max-width: 1100px;
            margin: 0 auto;
          }
          .plan-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
          }
          .back-btn {
            border: none;
            background: transparent;
            color: var(--primary);
            font-weight: 700;
            cursor: pointer;
            font-size: 0.9rem;
          }
          .plan-layout {
            display: grid;
            grid-template-columns: 1fr 380px;
            gap: 24px;
          }
          .plan-content,
          .comment-panel {
            padding: 24px;
          }
          .plan-sections {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .plan-field {
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
          }
          .plan-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 6px;
          }
          .plan-field p {
            margin: 0;
            white-space: pre-wrap;
            font-size: 0.9rem;
          }
          .comment-panel h3 {
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 16px;
          }
          .comment-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-height: 400px;
            overflow-y: auto;
            margin-bottom: 16px;
          }
          .comment-bubble {
            background: #f0f7ff;
            border-radius: 12px;
            padding: 12px 16px;
          }
          .comment-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .comment-author {
            font-weight: 700;
            font-size: 0.85rem;
            color: var(--primary);
          }
          .comment-time {
            font-size: 0.75rem;
            color: var(--text-muted);
          }
          .comment-text {
            font-size: 0.9rem;
            margin: 0;
          }
          .comment-input-area {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .empty-hint {
            color: var(--text-muted);
            font-style: italic;
            font-size: 0.9rem;
          }
          @media (max-width: 768px) {
            .plan-layout {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="advisor-root">
      <nav className="advisor-sidebar">
        <div className="advisor-brand">
          <User size={22} color="var(--primary)" />
          <span>担当者ページ</span>
        </div>
        <div className="advisor-nav">
          <button
            className={`advisor-nav-item ${tab === "bookings" ? "active" : ""}`}
            onClick={() => setTab("bookings")}
          >
            <BookOpen size={18} /> 予約一覧
          </button>
          <button
            className={`advisor-nav-item ${tab === "schedule" ? "active" : ""}`}
            onClick={() => setTab("schedule")}
          >
            <Calendar size={18} /> シフト設定
          </button>
          <button
            className={`advisor-nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            <User size={18} /> プロフィール
          </button>
        </div>
        <button className="signout-btn" onClick={onSignOut}>
          ログアウト
        </button>
      </nav>

      <main className="advisor-main">
        {tab === "bookings" && (
          <div>
            <h1 className="advisor-title">予約一覧</h1>
            <p className="advisor-subtitle">
              自分に予約が入っている受講者の一覧です。クリックして事業計画書を閲覧できます。
            </p>
            {bookings.length === 0 ? (
              <div className="glass-card empty-card">
                <p>現在、予約はありません。</p>
              </div>
            ) : (
              <div className="bookings-grid">
                {bookings.map((b) => (
                  <button
                    key={b.id}
                    className="booking-card glass-card"
                    onClick={() => openPlan(b)}
                  >
                    <div className="booking-date">{b.booking_date}</div>
                    <div className="booking-time">{b.start_time}</div>
                    <div className="booking-badge">
                      {b.status === "confirmed" ? "確定" : "キャンセル"}
                    </div>
                    <div className="booking-action">📋 事業計画書を開く</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "schedule" && (
          <div>
            <h1 className="advisor-title">対応可能シフトの設定</h1>
            <p className="advisor-subtitle">
              各曜日の対応可能な時間を設定してください。
            </p>
            <div className="glass-card schedule-card">
              {DAYS.map((day, i) => (
                <div key={i} className="schedule-row">
                  <label className="day-toggle">
                    <input
                      type="checkbox"
                      checked={schedules[i].enabled}
                      onChange={(e) =>
                        setSchedules({
                          ...schedules,
                          [i]: { ...schedules[i], enabled: e.target.checked },
                        })
                      }
                    />
                    <span
                      className={`day-label ${schedules[i].enabled ? "active" : ""}`}
                    >
                      {day}曜日
                    </span>
                  </label>
                  {schedules[i].enabled && (
                    <div className="time-range">
                      <input
                        type="time"
                        className="time-input"
                        value={schedules[i].start}
                        onChange={(e) =>
                          setSchedules({
                            ...schedules,
                            [i]: { ...schedules[i], start: e.target.value },
                          })
                        }
                      />
                      <span>〜</span>
                      <input
                        type="time"
                        className="time-input"
                        value={schedules[i].end}
                        onChange={(e) =>
                          setSchedules({
                            ...schedules,
                            [i]: { ...schedules[i], end: e.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
              <button
                className="primary-btn save-btn"
                onClick={saveSchedules}
                disabled={saving}
              >
                <Save size={16} /> シフトを保存
              </button>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div>
            <h1 className="advisor-title">プロフィール設定</h1>
            <p className="advisor-subtitle">
              受講者に表示される担当者プロフィールを設定します。
            </p>
            <div className="glass-card profile-form">
              <div className="form-group">
                <label>表示名（氏名）</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="山田 花子"
                  value={profile.display_name}
                  onChange={(e) =>
                    setProfile({ ...profile, display_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>自己紹介・専門分野</label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="中小企業診断士。事業計画書の作成および資金調達のサポートを専門としています。"
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                />
              </div>
              <button
                className="primary-btn"
                onClick={saveProfile}
                disabled={saving}
              >
                <Save size={16} /> プロフィールを保存
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .advisor-root {
          display: flex;
          min-height: 100vh;
          background: #f0f4f8;
        }
        .advisor-sidebar {
          width: 220px;
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
        .advisor-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          font-size: 1rem;
          margin-bottom: 24px;
          color: var(--secondary);
        }
        .advisor-nav {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        .advisor-nav-item {
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
        .advisor-nav-item:hover {
          background: var(--bg-soft);
          color: var(--primary);
        }
        .advisor-nav-item.active {
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
        .advisor-main {
          flex: 1;
          padding: 40px;
          max-width: 900px;
        }
        .advisor-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--secondary);
          margin-bottom: 4px;
        }
        .advisor-subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 32px;
        }
        .bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .booking-card {
          text-align: left;
          padding: 20px;
          cursor: pointer;
          border: none;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }
        .booking-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
        .booking-date {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .booking-time {
          font-size: 0.9rem;
          color: var(--primary);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .booking-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #d1fae5;
          color: #065f46;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .booking-action {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .empty-card {
          padding: 32px;
          text-align: center;
          color: var(--text-muted);
        }
        .schedule-card {
          padding: 24px;
        }
        .schedule-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .day-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          min-width: 80px;
        }
        .day-label {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .day-label.active {
          color: var(--primary);
        }
        .time-range {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .time-input {
          padding: 6px 10px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 0.9rem;
        }
        .save-btn {
          margin-top: 20px;
        }
        .profile-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
