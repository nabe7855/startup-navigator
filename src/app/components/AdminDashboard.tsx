"use client";

import { supabase } from "@/lib/supabase";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  email: string; // Added email
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  initial_password?: string;
  created_at: string;
};

type AdminTab = "hours" | "advisors" | "calendar" | "students";

export default function AdminDashboard({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();

  let tab: AdminTab = "hours";
  if (pathname.includes("/admin/advisors")) tab = "advisors";
  else if (pathname.includes("/admin/calendar")) tab = "calendar";
  else if (pathname.includes("/admin/students")) tab = "students";

  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [newHour, setNewHour] = useState<OperatingHour>({
    date: "",
    start_time: "10:00",
    end_time: "18:00",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Time selector drag state
  const timeBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);

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

  const loadInvitations = async () => {
    const { data } = await supabase
      .from("invitations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setInvitations(data as Invitation[]);
  };

  const loadAllBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select(
        "*, profiles:user_id (display_name), advisor_profile:advisor_id (display_name)",
      )
      .order("booking_date");
    if (data) setAllBookings(data);
  };

  const loadStudents = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "user");

    if (profiles && profiles.length > 0) {
      const ids = profiles.map((p) => p.id);

      try {
        // Get pass counts - only if ids exist
        const { data: passData, error: passError } = await supabase
          .from("bookings")
          .select("user_id, evaluation_result")
          .in("user_id", ids)
          .eq("evaluation_result", "pass");

        if (passError) throw passError;

        // Get plans
        const { data: plans, error: planError } = await supabase
          .from("business_plans")
          .select("*")
          .in("user_id", ids);

        if (planError) throw planError;

        const enhancedStudents = profiles.map((p) => {
          const passCount =
            passData?.filter((b) => b.user_id === p.id).length || 0;
          const plan = plans?.find((pl) => pl.user_id === p.id);
          return { ...p, passCount, plan };
        });

        setStudents(enhancedStudents);
      } catch (err) {
        console.error("Error loading student details:", err);
      }
    } else {
      setStudents([]);
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([
        loadHours(),
        loadAdvisors(),
        loadInvitations(),
        loadAllBookings(),
        loadStudents(),
      ]);
    })();
  }, []);

  const saveHour = async () => {
    if (!selectedDate) return;
    setLoading(true);

    const existing = hours.find((h) => h.date === selectedDate);

    if (existing) {
      const { error } = await supabase
        .from("operating_hours")
        .update({
          start_time: newHour.start_time,
          end_time: newHour.end_time,
        })
        .eq("id", existing.id);
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.from("operating_hours").insert([
        {
          date: selectedDate,
          start_time: newHour.start_time,
          end_time: newHour.end_time,
        },
      ]);
      if (error) alert(error.message);
    }

    await loadHours();
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
      const { error } = await supabase.from("invitations").insert([
        {
          email: inviteEmail,
          role: "advisor",
          initial_password: invitePassword,
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          alert("このメールアドレスは既に招待されています。");
        } else {
          throw error;
        }
      } else {
        alert(
          `${inviteEmail} を担当者として招待しました。\n担当者の方はこのメールアドレスと設定したパスワードで新規登録を行ってください。`,
        );
        setInviteEmail("");
        setInvitePassword("");
        loadInvitations();
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
            onClick={() => router.push("/admin")}
          >
            <Calendar size={18} /> 予約可能日設定
          </button>
          <button
            className={`admin-nav-item ${tab === "calendar" ? "active" : ""}`}
            onClick={() => router.push("/admin/calendar")}
          >
            <Calendar size={18} /> スケジュール管理
          </button>
          <button
            className={`admin-nav-item ${tab === "advisors" ? "active" : ""}`}
            onClick={() => router.push("/admin/advisors")}
          >
            <Users size={18} /> 担当者管理
          </button>
          <button
            className={`admin-nav-item ${tab === "students" ? "active" : ""}`}
            onClick={() => router.push("/admin/students")}
          >
            <Users size={18} /> 受講生一覧
          </button>
        </div>
        <button className="signout-btn" onClick={onSignOut}>
          ログアウト
        </button>
      </nav>

      <main className="admin-main">
        {tab === "calendar" && (
          <div className="calendar-view">
            <h1 className="admin-title">全体スケジュール</h1>
            <p className="admin-subtitle">
              営業日ごとの担当者と受講生の状況を確認できます。
            </p>

            <div className="calendar-grid">
              {hours.map((h) => {
                const dayBookings = allBookings.filter(
                  (b) => b.booking_date === h.date,
                );
                return (
                  <div key={h.id || h.date} className="day-card glass-card">
                    <div className="day-card-header">
                      <h3>{h.date}</h3>
                      <span className="time-range">
                        {h.start_time}〜{h.end_time}
                      </span>
                    </div>
                    <div className="day-card-content">
                      {dayBookings.length === 0 ? (
                        <p className="empty-hint text-xs">予約なし</p>
                      ) : (
                        <div className="day-booking-list">
                          {dayBookings.map((b) => (
                            <button
                              key={b.id}
                              className="mini-booking-item"
                              onClick={() => setSelectedBooking(b)}
                            >
                              <span className="b-time">{b.start_time}</span>
                              <span className="b-names">
                                <span className="advisor-name">
                                  👨‍🏫 {b.advisor_profile?.display_name || "？"}
                                </span>
                                <span className="arrow">→</span>
                                <span className="user-name">
                                  👤 {b.profiles?.display_name || "？"}
                                </span>
                              </span>
                              {b.evaluation_result === "pass" && (
                                <span className="pass-chip">合格</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedBooking && (
              <div
                className="booking-modal-overlay"
                onClick={() => setSelectedBooking(null)}
              >
                <div
                  className="booking-modal glass-card animate-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>予約詳細</h3>
                    <button
                      className="close-btn"
                      onClick={() => setSelectedBooking(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="summary-item">
                      <span>日時:</span>
                      <strong>
                        {selectedBooking.booking_date}{" "}
                        {selectedBooking.start_time}
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>受講生:</span>
                      <strong>
                        {selectedBooking.profiles?.display_name || "？"}
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>担当者:</span>
                      <strong>
                        {selectedBooking.advisor_profile?.display_name || "？"}
                      </strong>
                    </div>
                    <div className="summary-item">
                      <span>判定:</span>
                      <span
                        className={`result-badge ${selectedBooking.evaluation_result}`}
                      >
                        {selectedBooking.evaluation_result === "pass"
                          ? "合格"
                          : selectedBooking.evaluation_result === "fail"
                            ? "不合格"
                            : "未判定"}
                      </span>
                    </div>
                    <hr />
                    <div className="report-detail">
                      <h4>受講生へのコメント</h4>
                      <pre>{selectedBooking.advisor_comment || "なし"}</pre>
                    </div>
                    <div className="report-detail">
                      <h4>運営用内部レポート</h4>
                      <pre>{selectedBooking.internal_report || "なし"}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "hours" && (
          <div className="hours-view">
            <h1 className="admin-title">営業日・時間設定</h1>
            <p className="admin-subtitle">
              カレンダーの日付を選択して、予約可能な時間帯を設定してください。
            </p>

            <div className="hours-grid-layout">
              {/* Calendar Section */}
              <div className="calendar-panel glass-card">
                <div className="calendar-header">
                  <button
                    className="icon-btn"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <span className="current-month">
                    {viewMonth.getFullYear()}年 {viewMonth.getMonth() + 1}月
                  </span>
                  <button
                    className="icon-btn"
                    onClick={() =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          viewMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="calendar-body">
                  <div className="weekday-header">
                    {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                      <div key={d} className="weekday">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="days-grid">
                    {Array.from({ length: 42 }).map((_, i) => {
                      const firstDay = new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth(),
                        1,
                      ).getDay();
                      const dNumber = i - firstDay + 1;
                      const dateObj = new Date(
                        viewMonth.getFullYear(),
                        viewMonth.getMonth(),
                        dNumber,
                      );
                      const isCurrentMonth =
                        dateObj.getMonth() === viewMonth.getMonth();
                      const dateStr = dateObj.toISOString().split("T")[0];
                      const isSelected = selectedDate === dateStr;
                      const config = hours.find((h) => h.date === dateStr);

                      if (!isCurrentMonth)
                        return <div key={i} className="day-cell muted" />;

                      return (
                        <div
                          key={i}
                          className={`day-cell ${isSelected ? "selected" : ""} ${config ? "has-config" : ""}`}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            if (config) {
                              setNewHour({
                                date: dateStr,
                                start_time: config.start_time.substring(0, 5),
                                end_time: config.end_time.substring(0, 5),
                              });
                            } else {
                              setNewHour({
                                date: dateStr,
                                start_time: "10:00",
                                end_time: "18:00",
                              });
                            }
                          }}
                        >
                          <span className="day-num">{dNumber}</span>
                          {config && (
                            <div className="config-hint">
                              {config.start_time.substring(0, 5)}〜
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Setting Panel Section */}
              <div className="settings-panel glass-card">
                {selectedDate ? (
                  <div className="setting-content animate-in">
                    <h3>{selectedDate} の設定</h3>
                    <p className="setting-hint">
                      バーをドラッグして営業時間を設定してください
                    </p>

                    <div className="time-range-picker">
                      <div className="time-labels">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <span key={i}>{i * 4}:00</span>
                        ))}
                      </div>

                      <div
                        className="time-bar-container"
                        ref={timeBarRef}
                        onMouseDown={(e) => {
                          const rect =
                            timeBarRef.current!.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = Math.max(
                            0,
                            Math.min(100, (x / rect.width) * 100),
                          );
                          const hour = Math.round((percent / 100) * 24);
                          setDragStart(hour);
                          setIsDragging(true);
                          const hStr = hour.toString().padStart(2, "0") + ":00";
                          setNewHour((prev) => ({
                            ...prev,
                            start_time: hStr,
                            end_time: hStr,
                          }));
                        }}
                        onMouseMove={(e) => {
                          if (!isDragging || dragStart === null) return;
                          const rect =
                            timeBarRef.current!.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = Math.max(
                            0,
                            Math.min(100, (x / rect.width) * 100),
                          );
                          const hour = Math.round((percent / 100) * 24);

                          const start = Math.min(dragStart, hour);
                          const end = Math.max(dragStart, hour);

                          setNewHour((prev) => ({
                            ...prev,
                            start_time:
                              start.toString().padStart(2, "0") + ":00",
                            end_time: end.toString().padStart(2, "0") + ":00",
                          }));
                        }}
                        onMouseUp={() => {
                          setIsDragging(false);
                          setDragStart(null);
                        }}
                        onMouseLeave={() => {
                          if (isDragging) {
                            setIsDragging(false);
                            setDragStart(null);
                          }
                        }}
                      >
                        {/* Grid ticks */}
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className="time-tick"
                            style={{ left: `${(i / 24) * 100}%` }}
                          />
                        ))}

                        {/* Highlighted Range */}
                        <div
                          className="range-highlight"
                          style={{
                            left: `${(parseInt(newHour.start_time) / 24) * 100}%`,
                            width: `${((parseInt(newHour.end_time) - parseInt(newHour.start_time)) / 24) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="time-value-display">
                        <div className="t-box">
                          <span>開始</span>
                          <strong>{newHour.start_time}</strong>
                        </div>
                        <div className="t-separator">〜</div>
                        <div className="t-box">
                          <span>終了</span>
                          <strong>{newHour.end_time}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="actions">
                      <button
                        className="primary-btn w-full"
                        onClick={saveHour}
                        disabled={loading}
                      >
                        <Plus size={16} /> 設定を保存する
                      </button>
                      {hours.find((h) => h.date === selectedDate) && (
                        <button
                          className="text-btn danger w-full mt-4"
                          onClick={() => {
                            const h = hours.find(
                              (h) => h.date === selectedDate,
                            );
                            if (h?.id) removeHour(h.id);
                          }}
                        >
                          この日の設定を削除
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-selection">
                    <Calendar size={48} />
                    <p>カレンダーから日付を選択してください</p>
                  </div>
                )}
              </div>
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
              {invitations.length === 0 ? (
                <p className="empty-hint">招待された担当者はまだいません。</p>
              ) : (
                <div className="advisor-list">
                  {invitations.map((inv, idx) => {
                    // Check if a profile exists for this invitation email
                    const profile = advisors.find((p) => p.email === inv.email);
                    const isJoined = !!profile;

                    return (
                      <div
                        key={inv.id || inv.email || idx}
                        className={`advisor-row ${isJoined ? "joined" : "pending"}`}
                      >
                        <div className="advisor-avatar">
                          {isJoined ? profile.display_name?.[0] || "A" : "✉"}
                        </div>
                        <div className="advisor-info">
                          <div className="name-status">
                            <strong>
                              {isJoined ? profile.display_name : "招待中"}
                            </strong>
                            <span
                              className={`status-badge ${isJoined ? "active" : "waiting"}`}
                            >
                              {isJoined ? "認証済み" : "招待中"}
                            </span>
                          </div>
                          <div className="credential-info">
                            <span className="info-item">
                              <label>Email:</label> {inv.email}
                            </span>
                            <span className="info-item">
                              <label>Initial Pass:</label>{" "}
                              {inv.initial_password || "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "students" && (
          <div className="students-view">
            <h1 className="admin-title">受講生一覧・進捗</h1>
            <p className="admin-subtitle">
              受講生の進捗状況、合格数、事業計画書を確認できます。
            </p>

            <div className="students-grid">
              {students.length === 0 ? (
                <p className="empty-hint">受講生はまだ登録されていません。</p>
              ) : (
                students.map((s) => (
                  <div
                    key={s.id}
                    className="student-card glass-card"
                    onClick={() => setSelectedStudent(s)}
                  >
                    <div className="student-header">
                      <div className="student-avatar">
                        {s.display_name?.[0] || "U"}
                      </div>
                      <div className="student-info">
                        <h3>{s.display_name}</h3>
                        <p className="student-email">{s.email}</p>
                      </div>
                    </div>
                    <div className="student-stats">
                      <div className="stat-item">
                        <span className="stat-label">合格数</span>
                        <span className="stat-val pass">{s.passCount} / 4</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">計画書</span>
                        <span
                          className={`stat-val ${s.plan ? "done" : "waiting"}`}
                        >
                          {s.plan ? "提出済み" : "未作成"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {selectedStudent && (
              <div
                className="booking-modal-overlay"
                onClick={() => setSelectedStudent(null)}
              >
                <div
                  className="student-detail-modal glass-card animate-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>受講生詳細進捗: {selectedStudent.display_name}</h3>
                    <button
                      className="close-btn"
                      onClick={() => setSelectedStudent(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body scrollable">
                    <div className="plan-paper-header">
                      📖 事業計画書サマリー
                    </div>
                    {selectedStudent.plan ? (
                      <div className="plan-paper">
                        <div className="paper-title">
                          【事業計画書】 特定創業支援事業
                          起業創業相談窓口事業（宇都宮市）
                        </div>
                        {/* 1. Basic Info */}
                        <div className="table-wrapper">
                          <table className="trad-table">
                            <tbody>
                              <tr>
                                <th
                                  className="bg-yellow"
                                  style={{ width: "180px" }}
                                >
                                  作成日
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.create_date?.replace(
                                    /-/g,
                                    " / ",
                                  ) || "　　　年　月　日"}{" "}
                                  作成
                                </td>
                              </tr>
                              <tr>
                                <th className="bg-yellow">
                                  ふりがな
                                  <br />
                                  <span style={{ fontSize: "1.2rem" }}>
                                    お名前
                                  </span>
                                </th>
                                <td style={{ height: "60px" }}>
                                  <div
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#666",
                                    }}
                                  >
                                    {selectedStudent.plan.plan_data
                                      ?.name_kana || "　"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "1.2rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {selectedStudent.plan.plan_data
                                      ?.name_full || "　"}
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 1. Motivation */}
                        <div className="section-head trad-bg-yellow">
                          1. 創業の動機（目的・動機） 300字程度で
                        </div>
                        <div className="section-body">
                          {selectedStudent.plan.plan_data?.motivation || "　"}
                        </div>

                        {/* 2. Resume */}
                        <div className="section-head trad-bg-yellow">
                          2.
                          経営者の略歴（勤務先、担当業務、役職、技能・資格等）
                        </div>
                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ marginTop: "-2px" }}
                          >
                            <thead>
                              <tr>
                                <th
                                  style={{
                                    width: "120px",
                                    textAlign: "center",
                                  }}
                                >
                                  年　月
                                </th>
                                <th style={{ textAlign: "center" }}>内容</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                (selectedStudent.plan.plan_data
                                  ?.cv_rows as any[]) || [
                                  { date: "", content: "" },
                                ]
                              ).map((row: any, i: number) => (
                                <tr key={i}>
                                  <td
                                    style={{
                                      textAlign: "center",
                                      height: "28px",
                                    }}
                                  >
                                    {row.date}
                                  </td>
                                  <td>{row.content}</td>
                                </tr>
                              ))}
                              {Array.from({
                                length: Math.max(
                                  0,
                                  4 -
                                    ((
                                      selectedStudent.plan.plan_data
                                        ?.cv_rows as any[]
                                    )?.length || 0),
                                ),
                              }).map((_, i) => (
                                <tr key={`empty-${i}`}>
                                  <td style={{ height: "28px" }}></td>
                                  <td></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* 3. Service Details */}
                        <div className="section-head trad-bg-yellow">
                          3.
                          事業内容（簡潔に　誰に・どんな・どうやって商品やサービスを届けるか？）
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "60px" }}
                        >
                          {selectedStudent.plan.plan_data?.service_main || "　"}
                        </div>

                        <div className="section-head trad-bg-yellow">
                          ①取り扱い商品・サービス等
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "60px" }}
                        >
                          {selectedStudent.plan.plan_data?.service_items ||
                            "　"}
                        </div>

                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ borderTop: "none" }}
                          >
                            <tbody>
                              <tr>
                                <th
                                  className="trad-bg-yellow"
                                  style={{ width: "300px" }}
                                >
                                  ②客単価（現時点で想定される金額）
                                </th>
                                <td>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.service_unit_price
                                  }{" "}
                                  円
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">
                                  ③営業日数（365-休日）
                                </th>
                                <td>
                                  {selectedStudent.plan.plan_data?.service_days}{" "}
                                  日
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="section-head trad-bg-yellow">
                          ④セールスポイント
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "40px" }}
                        >
                          {selectedStudent.plan.plan_data?.service_strength ||
                            "　"}
                        </div>

                        <div className="section-head trad-bg-yellow">
                          ⑤販売ターゲット・販売戦略について（集客について）
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "40px" }}
                        >
                          {selectedStudent.plan.plan_data?.service_strategy ||
                            "　"}
                        </div>

                        <div className="section-head trad-bg-yellow">
                          ⑥競合・市場調査の結果
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "40px" }}
                        >
                          {selectedStudent.plan.plan_data?.service_research ||
                            "　"}
                        </div>

                        {/* 4. Org */}
                        <div className="section-head trad-bg-yellow">
                          4. 組織体制
                        </div>
                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ marginTop: "-2px" }}
                          >
                            <tbody>
                              <tr>
                                <th
                                  className="trad-bg-yellow"
                                  style={{ width: "250px" }}
                                >
                                  ①従業員
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data
                                    ?.org_employees || 0}{" "}
                                  名
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">
                                  ②パート・アルバイト
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data
                                    ?.org_part_time || 0}{" "}
                                  名
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">③その他</th>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.org_others ||
                                    0}{" "}
                                  名
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 5. Partners */}
                        <div className="section-head trad-bg-yellow">
                          5. 取引先・顧客・お客様の客層
                        </div>
                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ marginTop: "-2px" }}
                          >
                            <tbody>
                              <tr>
                                <th
                                  className="trad-bg-yellow"
                                  style={{ width: "180px" }}
                                >
                                  ①販売先
                                </th>
                                <td style={{ height: "60px" }}>
                                  {selectedStudent.plan.plan_data
                                    ?.partners_sales || "　"}
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">②仕入先</th>
                                <td style={{ height: "60px" }}>
                                  {selectedStudent.plan.plan_data
                                    ?.partners_supplier || "　"}
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">③外注先</th>
                                <td style={{ height: "60px" }}>
                                  {selectedStudent.plan.plan_data
                                    ?.partners_outsourcing || "　"}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 6. Funds */}
                        <div className="section-head trad-bg-yellow">
                          6. 必要な資金と調達方法
                        </div>
                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ marginTop: "-2px", tableLayout: "fixed" }}
                          >
                            <thead>
                              <tr className="trad-bg-yellow">
                                <th
                                  colSpan={2}
                                  style={{
                                    textAlign: "center",
                                    height: "28px",
                                  }}
                                >
                                  必要資金
                                </th>
                                <th colSpan={3} style={{ textAlign: "center" }}>
                                  調達方法
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <th
                                  className="trad-bg-yellow"
                                  style={{ width: "100px" }}
                                >
                                  設備資金
                                </th>
                                <td style={{ padding: 0 }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                    }}
                                  >
                                    <tbody>
                                      {(
                                        selectedStudent.plan.plan_data
                                          ?.funds_equip_items || []
                                      )
                                        .filter((f: any) => f.item)
                                        .map((f: any, i: number) => (
                                          <tr key={i}>
                                            <td
                                              style={{
                                                border: "none",
                                                borderBottom: "1px solid black",
                                                fontSize: "0.7rem",
                                                height: "24px",
                                              }}
                                            >
                                              {f.item}
                                            </td>
                                            <td
                                              style={{
                                                border: "none",
                                                borderLeft: "1px solid black",
                                                borderBottom: "1px solid black",
                                                textAlign: "right",
                                                width: "60px",
                                              }}
                                            >
                                              {f.amount}
                                            </td>
                                          </tr>
                                        ))}
                                      {Array.from({
                                        length: Math.max(
                                          1,
                                          3 -
                                            (selectedStudent.plan.plan_data?.funds_equip_items?.filter(
                                              (f: any) => f.item,
                                            ).length || 0),
                                        ),
                                      }).map((_, i) => (
                                        <tr key={`ef-empty-${i}`}>
                                          <td
                                            style={{
                                              border: "none",
                                              borderBottom: "1px solid black",
                                              height: "24px",
                                            }}
                                          ></td>
                                          <td
                                            style={{
                                              border: "none",
                                              borderLeft: "1px solid black",
                                              borderBottom: "1px solid black",
                                            }}
                                          ></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                                <th
                                  className="trad-bg-yellow"
                                  style={{ width: "120px" }}
                                >
                                  自己資金
                                </th>
                                <td
                                  style={{ textAlign: "right", width: "80px" }}
                                >
                                  {selectedStudent.plan.plan_data?.finance_self}
                                </td>
                                <td
                                  style={{ width: "30px", fontSize: "0.7rem" }}
                                >
                                  万円
                                </td>
                              </tr>
                              <tr>
                                <th className="trad-bg-yellow">運転資金</th>
                                <td style={{ padding: 0 }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                    }}
                                  >
                                    <tbody>
                                      {(
                                        selectedStudent.plan.plan_data
                                          ?.funds_work_items || []
                                      )
                                        .filter((f: any) => f.item)
                                        .map((f: any, i: number) => (
                                          <tr key={i}>
                                            <td
                                              style={{
                                                border: "none",
                                                borderBottom: "1px solid black",
                                                fontSize: "0.7rem",
                                                height: "24px",
                                              }}
                                            >
                                              {f.item}
                                            </td>
                                            <td
                                              style={{
                                                border: "none",
                                                borderLeft: "1px solid black",
                                                borderBottom: "1px solid black",
                                                textAlign: "right",
                                                width: "60px",
                                              }}
                                            >
                                              {f.amount}
                                            </td>
                                          </tr>
                                        ))}
                                      {Array.from({
                                        length: Math.max(
                                          1,
                                          3 -
                                            (selectedStudent.plan.plan_data?.funds_work_items?.filter(
                                              (f: any) => f.item,
                                            ).length || 0),
                                        ),
                                      }).map((_, i) => (
                                        <tr key={`wf-empty-${i}`}>
                                          <td
                                            style={{
                                              border: "none",
                                              borderBottom: "1px solid black",
                                              height: "24px",
                                            }}
                                          ></td>
                                          <td
                                            style={{
                                              border: "none",
                                              borderLeft: "1px solid black",
                                              borderBottom: "1px solid black",
                                            }}
                                          ></td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                                <th className="trad-bg-yellow">
                                  金融機関からの借入
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.finance_loan}
                                </td>
                                <td style={{ fontSize: "0.7rem" }}>万円</td>
                              </tr>
                              <tr className="trad-bg-yellow">
                                <td colSpan={2} style={{ textAlign: "right" }}>
                                  合計{" "}
                                  <strong>
                                    {(
                                      selectedStudent.plan.plan_data
                                        ?.funds_equip_items || []
                                    ).reduce(
                                      (acc: number, cur: any) =>
                                        acc + Number(cur.amount || 0),
                                      0,
                                    ) +
                                      (
                                        selectedStudent.plan.plan_data
                                          ?.funds_work_items || []
                                      ).reduce(
                                        (acc: number, cur: any) =>
                                          acc + Number(cur.amount || 0),
                                        0,
                                      )}
                                  </strong>{" "}
                                  万円
                                </td>
                                <td colSpan={3} style={{ textAlign: "right" }}>
                                  合計{" "}
                                  <strong>
                                    {Number(
                                      selectedStudent.plan.plan_data
                                        ?.finance_self || 0,
                                    ) +
                                      Number(
                                        selectedStudent.plan.plan_data
                                          ?.finance_loan || 0,
                                      )}
                                  </strong>{" "}
                                  万円
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 7. Business Plan Table */}
                        <div className="section-head trad-bg-yellow">
                          7. 事業計画について
                        </div>
                        <div className="table-wrapper">
                          <table
                            className="trad-table"
                            style={{ marginTop: "-2px", fontSize: "0.80rem" }}
                          >
                            <tbody>
                              <tr
                                className="trad-bg-yellow"
                                style={{ textAlign: "center" }}
                              >
                                <th style={{ width: "150px" }}>
                                  ①売上について (年間)
                                </th>
                                <th style={{ width: "80px" }}>創業当初</th>
                                <th style={{ width: "80px" }}>1年後</th>
                                <th style={{ width: "200px" }}>数字の根拠</th>
                                <th style={{ width: "120px" }}>例</th>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">　売上高(a)</td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.startup_sales
                                  }
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.after1y_sales
                                  }
                                </td>
                                <td>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.startup_basis
                                  }
                                </td>
                                <td style={{ fontSize: "0.6rem" }}>
                                  単価×数量×12か月分
                                </td>
                              </tr>
                              <tr style={{ height: "24px" }}>
                                <td className="trad-bg-yellow"></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">
                                  　売上原価(b)
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.startup_cost}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.after1y_cost}
                                </td>
                                <td>
                                  {selectedStudent.plan.plan_data?.cost_basis}
                                </td>
                                <td></td>
                              </tr>

                              <tr
                                className="trad-bg-yellow"
                                style={{ textAlign: "center" }}
                              >
                                <th style={{ width: "150px" }}>
                                  ②経費について
                                </th>
                                <th style={{ width: "80px" }}>創業当初</th>
                                <th style={{ width: "80px" }}>1年後</th>
                                <th style={{ width: "200px" }}>数字の根拠</th>
                                <th></th>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">　人件費</td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.startup_labor
                                  }
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.after1y_labor
                                  }
                                </td>
                                <td>
                                  {selectedStudent.plan.plan_data?.labor_basis}
                                </td>
                                <td style={{ fontSize: "0.6rem" }}>
                                  例)20万円×2名×12か月
                                </td>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">　家賃</td>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.startup_rent}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {selectedStudent.plan.plan_data?.after1y_rent}
                                </td>
                                <td>
                                  {selectedStudent.plan.plan_data?.rent_basis}
                                </td>
                                <td style={{ fontSize: "0.6rem" }}>
                                  例)7万円×12か月分
                                </td>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">　支払利息</td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.startup_interest
                                  }
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.after1y_interest
                                  }
                                </td>
                                <td>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.interest_basis
                                  }
                                </td>
                                <td style={{ fontSize: "0.6rem" }}>
                                  例)500万円×2%
                                </td>
                              </tr>
                              <tr>
                                <td className="trad-bg-yellow">　その他</td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.startup_others
                                  }
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.after1y_others
                                  }
                                </td>
                                <td>
                                  {
                                    selectedStudent.plan.plan_data
                                      ?.proj_others_basis
                                  }
                                </td>
                                <td></td>
                              </tr>
                              <tr className="trad-bg-yellow">
                                <th style={{ textAlign: "center" }}>
                                  　経費合計 (c)
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  {Number(
                                    selectedStudent.plan.plan_data
                                      ?.startup_labor || 0,
                                  ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.startup_rent || 0,
                                    ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.startup_interest || 0,
                                    ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.startup_others || 0,
                                    )}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  {Number(
                                    selectedStudent.plan.plan_data
                                      ?.after1y_labor || 0,
                                  ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.after1y_rent || 0,
                                    ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.after1y_interest || 0,
                                    ) +
                                    Number(
                                      selectedStudent.plan.plan_data
                                        ?.after1y_others || 0,
                                    )}
                                </td>
                                <td></td>
                                <td></td>
                              </tr>
                              <tr className="trad-bg-yellow">
                                <th style={{ textAlign: "center" }}>
                                  ③利益 (a-b-c)
                                </th>
                                <td style={{ textAlign: "right" }}>
                                  <strong>
                                    {Number(
                                      selectedStudent.plan.plan_data
                                        ?.startup_sales || 0,
                                    ) -
                                      Number(
                                        selectedStudent.plan.plan_data
                                          ?.startup_cost || 0,
                                      ) -
                                      (Number(
                                        selectedStudent.plan.plan_data
                                          ?.startup_labor || 0,
                                      ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.startup_rent || 0,
                                        ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.startup_interest || 0,
                                        ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.startup_others || 0,
                                        ))}
                                  </strong>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <strong>
                                    {Number(
                                      selectedStudent.plan.plan_data
                                        ?.after1y_sales || 0,
                                    ) -
                                      Number(
                                        selectedStudent.plan.plan_data
                                          ?.after1y_cost || 0,
                                      ) -
                                      (Number(
                                        selectedStudent.plan.plan_data
                                          ?.after1y_labor || 0,
                                      ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.after1y_rent || 0,
                                        ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.after1y_interest || 0,
                                        ) +
                                        Number(
                                          selectedStudent.plan.plan_data
                                            ?.after1y_others || 0,
                                        ))}
                                  </strong>
                                </td>
                                <td
                                  colSpan={2}
                                  style={{ background: "#eee" }}
                                ></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* 8. Others */}
                        <div className="section-head trad-bg-yellow">
                          8.
                          その他（特に相談時に聞きたい内容があれば記入をお願いいたします）
                        </div>
                        <div
                          className="section-body"
                          style={{ minHeight: "60px" }}
                        >
                          {selectedStudent.plan.plan_data?.other_requests ||
                            "　"}
                        </div>
                      </div>
                    ) : (
                      <p
                        className="empty-hint"
                        style={{ padding: "40px", textAlign: "center" }}
                      >
                        まだ作成されていません。
                      </p>
                    )}

                    <hr />

                    <section className="detail-section">
                      <h4>📝 セッション履歴・レポート</h4>
                      <div className="session-history">
                        {allBookings.filter(
                          (b) => b.user_id === selectedStudent.id,
                        ).length === 0 ? (
                          <p className="empty-hint">予約履歴がありません。</p>
                        ) : (
                          allBookings
                            .filter((b) => b.user_id === selectedStudent.id)
                            .map((b) => (
                              <div key={b.id} className="history-item">
                                <div className="history-head">
                                  <span className="h-date">
                                    {b.booking_date} {b.start_time}
                                  </span>
                                  <span
                                    className={`result-badge ${b.evaluation_result}`}
                                  >
                                    {b.evaluation_result === "pass"
                                      ? "合格"
                                      : b.evaluation_result === "fail"
                                        ? "不合格"
                                        : "受講中"}
                                  </span>
                                </div>
                                <div className="h-advisor">
                                  担当: {b.advisor_profile?.display_name}
                                </div>
                                <div className="h-reports">
                                  <div className="h-report">
                                    <strong>内部レポート:</strong>
                                    <p>{b.internal_report || "なし"}</p>
                                  </div>
                                  <div className="h-comment">
                                    <strong>受講生へのコメント:</strong>
                                    <p>{b.advisor_comment || "なし"}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f1f5f9;
        }
        .admin-sidebar {
          order: 2;
          width: 100%;
          background: white;
          border-top: 1px solid #e2e8f0;
          padding: 8px 16px;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-around;
          position: fixed;
          bottom: 0;
          z-index: 100;
        }
        .admin-brand {
          display: none;
        }
        .admin-nav {
          display: flex;
          flex-direction: row;
          gap: 12px;
          flex: 1;
          justify-content: space-around;
        }
        .admin-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.65rem;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
        }
        .admin-nav-item.active {
          background: var(--primary-soft);
          color: var(--primary);
        }
        .admin-main {
          order: 1;
          flex: 1;
          padding: 16px;
          padding-bottom: 100px;
          width: 100%;
        }
        .admin-title {
          font-size: 1.5rem;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .admin-subtitle {
          color: #64748b;
          margin-bottom: 24px;
          font-size: 0.9rem;
        }

        /* Desktop Adjustments */
        @media (min-width: 900px) {
          .admin-root {
            flex-direction: row;
          }
          .admin-sidebar {
            order: 0;
            width: 240px;
            height: 100vh;
            flex-direction: column;
            border-top: none;
            border-right: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            padding: 32px 24px;
            justify-content: flex-start;
          }
          .admin-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 800;
            font-size: 1.1rem;
            margin-bottom: 40px;
            color: var(--secondary);
          }
          .admin-nav {
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
          }
          .admin-nav-item {
            flex-direction: row;
            font-size: 0.9rem;
            padding: 12px 16px;
            gap: 10px;
          }
          .admin-main {
            padding: 48px 60px;
            max-width: 1000px;
          }
          .admin-title {
            font-size: 2rem;
          }
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
          flex-shrink: 0;
        }
        .advisor-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .name-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-badge {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 700;
        }
        .status-badge.active {
          background: #dcfce7;
          color: #166534;
        }
        .status-badge.waiting {
          background: #fef9c3;
          color: #854d0e;
        }
        .credential-info {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .info-item {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: white;
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
        }
        .info-item label {
          font-weight: 700;
          color: var(--text-dim);
          margin-right: 4px;
        }
        .empty-hint {
          color: var(--text-muted);
          font-size: 0.9rem;
          font-style: italic;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .day-card {
          padding: 0;
          overflow: hidden;
        }
        .day-card-header {
          padding: 12px 16px;
          background: var(--primary-soft);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .day-card-header h3 {
          font-size: 1rem;
          font-weight: 800;
          margin: 0;
        }
        .day-card-header .time-range {
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 700;
        }
        .day-card-content {
          padding: 12px;
        }
        .day-booking-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .mini-booking-item {
          padding: 8px;
          background: #f8fafc;
          border-radius: 6px;
          font-size: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border: 1px solid transparent;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }
        .mini-booking-item:hover {
          border-color: var(--primary);
          background: #fff;
        }
        .booking-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 500px;
          z-index: 1000;
          padding: 24px;
          background: white;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #94a3b8;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .result-badge {
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 800;
        }
        .result-badge.pass {
          background: #dcfce7;
          color: #166534;
        }
        .result-badge.fail {
          background: #fee2e2;
          color: #991b1b;
        }
        .report-detail h4 {
          font-size: 0.85rem;
          color: #64748b;
          margin: 16px 0 8px;
        }
        .report-detail pre {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          white-space: pre-wrap;
          word-break: break-all;
        }
        hr {
          border: 0;
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        .animate-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -45%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
        .b-time {
          font-weight: 800;
          color: #64748b;
        }
        .b-names {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .advisor-name {
          color: var(--primary);
          font-weight: 700;
        }
        .user-name {
          color: var(--secondary);
          font-weight: 700;
        }
        .arrow {
          color: #cbd5e1;
        }
        .pass-chip {
          background: #dcfce7;
          color: #166534;
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.65rem;
          font-weight: 800;
          width: fit-content;
        }
        .mt-4 {
          margin-top: 16px;
        }
        .booking-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .booking-modal {
          width: 90%;
          max-width: 500px;
          padding: 24px;
          background: white;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #94a3b8;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .result-badge {
          padding: 2px 8px;
          border-radius: 99px;
          font-weight: 800;
          font-size: 0.75rem;
        }
        .result-badge.pass {
          background: #dcfce7;
          color: #166534;
        }
        .result-badge.fail {
          background: #fee2e2;
          color: #991b1b;
        }
        .result-badge.pending {
          background: #f1f5f9;
          color: #475569;
        }
        .report-detail h4 {
          font-size: 0.85rem;
          color: #64748b;
          margin: 16px 0 8px;
        }
        .report-detail pre {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          white-space: pre-wrap;
          word-break: break-all;
          font-family: inherit;
        }
        hr {
          border: 0;
          border-top: 1px solid #e2e8f0;
          margin: 20px 0;
        }
        .animate-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .students-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .student-card {
          padding: 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .student-card:hover {
          transform: translateY(-4px);
        }
        .student-header {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .student-avatar {
          width: 48px;
          height: 48px;
          background: var(--primary-soft);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.25rem;
        }
        .student-info h3 {
          margin: 0;
          font-size: 1.1rem;
        }
        .student-email {
          font-size: 0.8rem;
          color: #64748b;
          margin: 2px 0 0;
        }
        .student-stats {
          display: flex;
          gap: 16px;
          border-top: 1px solid #f1f5f9;
          padding-top: 16px;
        }
        .stat-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-label {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 700;
        }
        .stat-val {
          font-size: 0.9rem;
          font-weight: 800;
        }
        .stat-val.pass {
          color: #10b981;
        }
        .stat-val.done {
          color: var(--primary);
        }
        .stat-val.waiting {
          color: #94a3b8;
        }

        .student-detail-modal {
          width: 95%;
          max-width: 800px;
          max-height: 90vh;
          background: white;
          padding: 16px;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          border-radius: 12px;
        }
        @media (min-width: 768px) {
          .student-detail-modal {
            padding: 32px;
          }
        }
        .modal-body.scrollable {
          overflow-y: auto;
          flex: 1;
          padding-right: 8px;
        }
        .detail-section h4 {
          font-size: 1rem;
          color: var(--secondary);
          margin-bottom: 16px;
        }
        .plan-paper {
          background: white !important;
          color: black !important;
          padding: 12px;
          border-radius: 4px;
        }
        @media (min-width: 768px) {
          .plan-paper {
            padding: 24px;
          }
        }
        .paper-title {
          font-size: 1.25rem;
          font-weight: 900;
          margin: 16px 0 24px;
          border-bottom: 2px solid black;
          padding-bottom: 12px;
          text-align: center;
          color: black !important;
        }
        .table-wrapper {
          overflow-x: auto;
          margin-bottom: 32px;
          border: 2px solid black;
          background: white;
        }
        .trad-table {
          min-width: 600px;
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 0;
          background: white;
        }
        .trad-table th,
        .trad-table td {
          border: 1px solid black !important;
          padding: 12px;
          text-align: left;
          line-height: 1.6;
          color: black !important;
        }
        .trad-bg-yellow {
          background-color: #fff3cd !important;
          font-weight: 800 !important;
        }
        .section-head {
          font-weight: 800;
          border: 2px solid black;
          border-bottom: none;
          padding: 8px 16px;
          font-size: 1rem;
          color: black !important;
          margin-top: 0;
          background: #fff3cd;
        }
        .section-body {
          border: 2px solid black;
          padding: 16px;
          min-height: 80px;
          white-space: pre-wrap;
          margin-bottom: 0;
          font-size: 1rem;
          line-height: 1.8;
          color: black !important;
          border-bottom: none;
          background: white;
        }
        /* Last section body should have bottom border */
        .section-body:last-of-type {
          border-bottom: 2px solid black;
          margin-bottom: 32px;
        }
        .mini-list-item {
          display: block;
          font-size: 0.8rem;
          margin-bottom: 4px;
        }
        .session-history {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .history-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .history-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .h-date {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .h-advisor {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 12px;
        }
        .h-reports {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 600px) {
          .h-reports {
            grid-template-columns: 1fr 1fr;
          }
        }
        .h-report,
        .h-comment {
          background: #f8fafc;
          padding: 10px;
          border-radius: 8px;
        }
        .h-report strong,
        .h-comment strong {
          font-size: 0.7rem;
          color: #94a3b8;
          display: block;
          margin-bottom: 4px;
        }
        .h-report p,
        .h-comment p {
          font-size: 0.8rem;
          margin: 0;
          white-space: pre-wrap;
        }
        .hours-grid-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (min-width: 900px) {
          .hours-grid-layout {
            grid-template-columns: 1fr 340px;
          }
        }
        .calendar-panel {
          padding: 24px;
          background: white;
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .icon-btn {
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .icon-btn:hover {
          background: var(--bg-soft);
          color: var(--primary);
        }
        .current-month {
          font-weight: 800;
          font-size: 1.1rem;
        }
        .weekday-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .weekday {
          font-size: 0.75rem;
          font-weight: 800;
          color: #94a3b8;
        }
        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .day-cell {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        .day-cell:hover {
          background: var(--bg-soft);
        }
        .day-cell.selected {
          background: var(--primary);
          color: white;
        }
        .day-cell.has-config {
          background: var(--primary-soft);
          color: var(--primary);
        }
        .day-cell.selected.has-config {
          background: var(--primary);
          color: white;
        }
        .day-num {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .config-hint {
          font-size: 0.6rem;
          font-weight: 800;
          margin-top: 2px;
        }
        .settings-panel {
          padding: 24px;
          background: white;
          min-height: 400px;
        }
        .empty-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #cbd5e1;
          text-align: center;
          gap: 16px;
        }
        .setting-hint {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 24px;
        }
        .time-range-picker {
          margin-bottom: 32px;
        }
        .time-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: #94a3b8;
          font-weight: 800;
          margin-bottom: 8px;
        }
        .time-bar-container {
          height: 32px;
          background: #f1f5f9;
          border-radius: 6px;
          position: relative;
          cursor: crosshair;
          user-select: none;
          margin-bottom: 24px;
        }
        .time-tick {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: rgba(0, 0, 0, 0.05);
        }
        .range-highlight {
          position: absolute;
          top: 0;
          bottom: 0;
          background: var(--primary);
          border-radius: 4px;
          opacity: 0.8;
          border: 2px solid white;
        }
        .time-value-display {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }
        .t-box {
          text-align: center;
        }
        .t-box span {
          display: block;
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .t-box strong {
          font-size: 1.2rem;
          color: var(--primary);
        }
        .t-separator {
          padding-top: 14px;
          color: #cbd5e1;
          font-weight: 900;
        }
        .danger {
          color: #ef4444;
        }
        .danger:hover {
          color: #dc2626;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
