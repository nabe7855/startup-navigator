"use client";

import AdminDashboard from "@/app/components/AdminDashboard";
import AdvisorDashboard from "@/app/components/AdvisorDashboard";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Layout,
  Rocket,
  UserPlus,
} from "lucide-react";
import React, { useEffect, useState } from "react";

export default function StartupNavigator() {
  const [view, setView] = useState<"dashboard" | "booking" | "wizard">(
    "dashboard",
  );
  const [step, setStep] = useState(1);
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    id: string;
    role: string;
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Consolidate auth logic
    const initializeAuth = async () => {
      try {
        // Initial session check
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          await fetchUserProfile(session.user.id, session.user.email!);
        }

        if (mounted) {
          setAuthChecking(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    initializeAuth();

    // Safety timeout: stop loading after 8 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted && authChecking) {
        console.warn("Auth check timed out, forcing load stop");
        setAuthChecking(false);
      }
    }, 8000);

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session) => {
      console.log("Auth event:", event);
      if (!mounted) return;

      if (session) {
        await fetchUserProfile(session.user.id, session.user.email!);
      } else {
        setUser(null);
      }

      // If we got an event, we definitely checked auth
      setAuthChecking(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    console.log("Fetching profile for:", userId);

    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Profile fetch timeout")), 5000),
    );

    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const { data, error } = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.warn("Profile fetch error (using fallback):", error);
      }

      console.log("Setting user with role:", data?.role || "user");
      setUser({
        email,
        id: userId,
        role: data?.role || "user",
      });
    } catch (e) {
      console.error("fetchUserProfile failed:", e);
      // Fallback: assume 'user' role so they can at least see the dashboard
      setUser({ email, id: userId, role: "user" });
    }
  };

  // Business Plan States (Comprehensive for Utsunomiya City / specific startup support)
  const [planData, setPlanData] = useState({
    // 基本情報
    create_date: "2026-03-06",
    name_kana: "",
    name_full: "",

    // 1. 創業の動機 (300字程度)
    motivation: "",

    // 2. 経営者の略歴 (テーブル形式)
    cv_rows: [
      { date: "", content: "" },
      { date: "", content: "" },
      { date: "", content: "" },
      { date: "", content: "" },
    ],

    // 3. 事業内容
    service_main: "", // 事業内容（簡潔に）
    service_items: "", // ①取り扱い商品・サービス等
    service_unit_price: "", // ②客単価
    service_days: "", // ③営業日数
    service_strength: "", // ④セールスポイント
    service_strategy: "", // ⑤販売ターゲット・戦略
    service_research: "", // ⑥競合・市場調査の結果

    // 4. 組織体制
    org_employees: "0",
    org_part_time: "0",
    org_others: "0",

    // 5. 取引先・顧客・お客様の客層
    partners_sales: "",
    partners_supplier: "",
    partners_outsourcing: "",

    // 6. 必要な資金と調達方法
    // 設備資金
    funds_equip_items: [
      { item: "", amount: "" },
      { item: "", amount: "" },
    ],
    // 運転資金
    funds_work_items: [
      { item: "", amount: "" },
      { item: "", amount: "" },
    ],
    // 調達方法
    finance_self: "",
    finance_loan: "",
    finance_loan_cond: { type: "", period: "", interest: "" },

    // 7. 事業計画について
    // 創業当初
    startup_sales: "",
    startup_cost: "",
    startup_labor: "",
    startup_rent: "",
    startup_interest: "",
    startup_others: "",
    startup_basis: "", // 数字の根拠
    // 1年後
    after1y_sales: "",
    after1y_cost: "",
    after1y_labor: "",
    after1y_rent: "",
    after1y_interest: "",
    after1y_others: "",
    after1y_basis: "", // 数字の根拠

    // 8. その他
    other_requests: "",
  });

  const TOTAL_STEPS = 9;
  const handleStepNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const handleStepBack = () => setStep((s) => Math.max(s - 1, 1));

  // Booking states
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(
    null,
  );

  const [availableHours, setAvailableHours] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [advisorSchedules, setAdvisorSchedules] = useState<any[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    if (view === "booking") {
      void loadBookingData();
    }
  }, [view]);

  const loadBookingData = async () => {
    setLoading(true);
    try {
      // 1. Load Admin set operating dates
      const { data: h } = await supabase.from("operating_hours").select("*");
      setAvailableHours(h || []);

      // 2. Load Advisors
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "advisor");
      setAdvisors(p || []);

      // 3. Load Advisor Schedules
      const { data: s } = await supabase.from("advisor_schedules").select("*");
      setAdvisorSchedules(s || []);

      // 4. Load Existing Bookings
      const { data: b } = await supabase.from("bookings").select("*");
      setExistingBookings(b || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedDateStr || !selectedSlot || !selectedAdvisorId || !user)
      return;
    setLoading(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        user_id: user.id,
        advisor_id: selectedAdvisorId,
        booking_date: selectedDateStr,
        start_time: selectedSlot,
        status: "confirmed",
      });
      if (error) throw error;
      alert("予約が完了しました！");
      setView("dashboard");
    } catch (e: any) {
      alert("予約に失敗しました: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        // Signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        alert(
          "登録が完了しました。確認メールを送信した場合はご確認ください（ローカルテスト時はそのままログインされることがあります）。",
        );
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setView("dashboard");
  };

  if (authChecking) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        読み込み中...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-outer">
        <header className="auth-header animate-in">
          <div className="brand glow">
            <Rocket size={32} color="var(--primary)" />
            <h1>STARTUP NAVIGATOR</h1>
          </div>
          <p>起業家のための戦略拠点</p>
        </header>

        <main className="auth-card glass-card animate-in">
          <div className="auth-tabs">
            <button
              className={!isLogin ? "active" : ""}
              onClick={() => setIsLogin(false)}
            >
              新規登録
            </button>
            <button
              className={isLogin ? "active" : ""}
              onClick={() => setIsLogin(true)}
            >
              ログイン
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {!isLogin && (
              <div className="input-group">
                <label>お名前（フルネーム）</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="宇都宮 太郎"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="input-group">
              <label>メールアドレス</label>

              <input
                type="email"
                className="input-field"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>パスワード</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "処理中..." : isLogin ? "ログインする" : "開始する"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-footer">
            登録することで、利用規約に同意したことになります。
          </p>
        </main>

        <style jsx>{`
          .auth-outer {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 16px; /* Narrower padding for mobile */
            background: #f8fafc;
          }

          .auth-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 8px;
          }

          .brand h1 {
            font-size: 1.5rem; /* Smaller for mobile */
            font-weight: 800;
            letter-spacing: -0.5px;
          }

          .auth-header p {
            color: var(--text-dim);
            letter-spacing: 0.5px;
            text-transform: uppercase;
            font-size: 0.75rem;
          }

          .auth-card {
            width: 100%;
            max-width: 400px;
            padding: 24px; /* Flexible padding */
          }

          @media (min-width: 480px) {
            .auth-card {
              padding: 40px;
            }
            .brand h1 {
              font-size: 2rem;
            }
          }

          .auth-tabs {
            display: flex;
            background: var(--bg-soft);
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 24px;
          }

          .auth-tabs button {
            flex: 1;
            padding: 12px;
            border: none;
            background: transparent;
            font-family: var(--font-accent);
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            border-radius: 10px;
            transition: var(--transition-smooth);
            font-size: 0.9rem;
          }

          .auth-tabs button.active {
            background: var(--bg-white);
            color: var(--primary);
            box-shadow: var(--shadow-sm);
          }

          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .input-group label {
            display: block;
            margin-bottom: 6px;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-dim);
          }

          .auth-footer {
            margin-top: 24px;
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-muted);
          }

          .primary-btn {
            width: 100%;
            padding: 14px;
            font-size: 1rem;
          }
        `}</style>
      </div>
    );
  }

  // Role-based routing
  if (user.role === "admin") {
    return <AdminDashboard onSignOut={handleSignOut} />;
  }
  if (user.role === "advisor") {
    return <AdvisorDashboard userId={user.id} onSignOut={handleSignOut} />;
  }

  // User dashboard
  return (
    <div className="dashboard-root">
      <nav className="side-nav animate-in">
        <div className="brand-side">
          <Rocket size={24} color="var(--primary)" />
          <span>SN</span>
        </div>
        <div className="nav-items">
          <button
            className={`nav-icon ${view === "dashboard" ? "active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            <Layout size={20} />
          </button>
          <button
            className={`nav-icon ${view === "booking" ? "active" : ""}`}
            onClick={() => setView("booking")}
          >
            <Calendar size={20} />
          </button>
          <button
            className={`nav-icon ${view === "wizard" ? "active" : ""}`}
            onClick={() => {
              setView("wizard");
              setStep(1);
            }}
          >
            <Rocket size={20} />
          </button>
        </div>
        <div className="profile-trigger">
          <button className="icon-btn text-muted" onClick={handleSignOut}>
            ログアウト
          </button>
          <div className="avatar-small" style={{ marginLeft: 8 }}></div>
        </div>
      </nav>

      <div className="main-content">
        {view === "dashboard" ? (
          <>
            <header className="content-header fade-in">
              <div className="title-area">
                <h1>ダッシュボード</h1>
                <p className="welcome">おかえりなさい、{user.email} さん</p>
              </div>
              <div className="header-actions">
                <button
                  className="primary-btn outline-btn"
                  onClick={() => {
                    setView("wizard");
                    setStep(1);
                  }}
                >
                  計画書を作成
                </button>
                <button
                  className="primary-btn"
                  onClick={() => setView("booking")}
                >
                  面談を予約
                </button>
              </div>
            </header>

            <div className="stats-grid">
              <div className="glass-card stat-card animate-in-up">
                <div className="stat-header">
                  <div className="stat-icon-bg">
                    <Rocket size={18} color="var(--primary)" />
                  </div>
                  <span className="stat-label">現在の進捗</span>
                </div>
                <div className="stat-value">25%</div>
                <div className="progress-bar-flat">
                  <div className="fill" style={{ width: "25%" }}></div>
                </div>
                <p className="stat-hint">次：事業計画書の作成 (Step 1/5)</p>
              </div>

              <div
                className="glass-card stat-card animate-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="stat-header">
                  <div className="stat-icon-bg">
                    <UserPlus size={18} color="var(--accent)" />
                  </div>
                  <span className="stat-label">完了タスク</span>
                </div>
                <div className="stat-value">1 / 4</div>
                <p className="stat-hint">キックオフ面談 完了</p>
              </div>
            </div>

            <section
              className="tasks-section glass-card animate-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="section-header">
                <h3>最近の活動</h3>
                <button className="text-btn">すべて見る</button>
              </div>
              <div className="activity-list">
                <div className="activity-item">
                  <CheckCircle size={16} color="var(--accent)" />
                  <div className="activity-info">
                    <p className="activity-desc">
                      初回面談 完了: オリエンテーション
                    </p>
                    <span className="activity-time">今日 10:00</span>
                  </div>
                </div>
                <div className="activity-item">
                  <div className="activity-dot"></div>
                  <div className="activity-info">
                    <p className="activity-desc">
                      事業計画書の作成を開始しました
                    </p>
                    <span className="activity-time">たった今</span>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : view === "booking" ? (
          <div className="booking-view">
            <header className="content-header fade-in">
              <div className="title-area">
                <h1>セッション予約</h1>
                <p className="description">
                  {loading
                    ? "データを取得中..."
                    : "アドバイザーの空き状況から日時を選択してください。"}
                </p>
              </div>
              <button className="text-btn" onClick={() => setView("dashboard")}>
                戻る
              </button>
            </header>
            <div className="booking-layout">
              {/* 1. Date Selection */}
              <div className="booking-panel glass-card animate-in-up">
                <h3>1. 日時を選択</h3>
                <div className="available-dates-list">
                  {availableHours.length === 0 ? (
                    <p className="empty-hint">現在予約可能な日はありません。</p>
                  ) : (
                    availableHours.map((h) => (
                      <button
                        key={h.id}
                        className={`date-option-card ${selectedDateStr === h.date ? "active" : ""}`}
                        onClick={() => {
                          setSelectedDateStr(h.date);
                          setSelectedSlot(null);
                          setSelectedAdvisorId(null);
                        }}
                      >
                        <span className="date-val">{h.date}</span>
                        <span className="time-range">
                          {h.start_time} - {h.end_time}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 2. Advisor & Slot Selection */}
              <div
                className="booking-panel glass-card animate-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <h3>2. 担当者と時間を選択</h3>
                {!selectedDateStr ? (
                  <p className="empty-hint text-center py-20">
                    先に日付を選択してください。
                  </p>
                ) : (
                  <div className="advisors-slots-area">
                    {advisors.length === 0 && (
                      <p className="empty-hint">担当者が登録されていません。</p>
                    )}
                    {advisors.map((advisor) => {
                      // Find advisor's schedule for this day of week
                      const dayOfWeek = new Date(selectedDateStr).getDay();
                      const schedule = advisorSchedules.find(
                        (s) =>
                          s.advisor_id === advisor.id &&
                          s.day_of_week === dayOfWeek,
                      );

                      if (!schedule) return null;

                      // Generate hourly slots
                      const startHour = parseInt(
                        schedule.start_time.split(":")[0],
                      );
                      const endHour = parseInt(schedule.end_time.split(":")[0]);
                      const slots = [];
                      for (let i = startHour; i < endHour; i++) {
                        slots.push(`${i}:00`);
                      }

                      return (
                        <div key={advisor.id} className="advisor-slots-row">
                          <div className="advisor-mini-profile">
                            <div className="avatar-xs">
                              {advisor.display_name?.[0] || "?"}
                            </div>
                            <span className="advisor-name">
                              {advisor.display_name}
                            </span>
                          </div>
                          <div className="slots-strip">
                            {slots.map((s) => {
                              const isBooked = existingBookings.some(
                                (b) =>
                                  b.advisor_id === advisor.id &&
                                  b.booking_date === selectedDateStr &&
                                  b.start_time.startsWith(s) &&
                                  b.status === "confirmed",
                              );
                              const isSelected =
                                selectedSlot === s &&
                                selectedAdvisorId === advisor.id;

                              return (
                                <button
                                  key={s}
                                  className={`mini-slot-btn ${isBooked ? "booked" : isSelected ? "active" : ""}`}
                                  disabled={isBooked}
                                  onClick={() => {
                                    setSelectedSlot(s);
                                    setSelectedAdvisorId(advisor.id);
                                  }}
                                >
                                  {s}
                                  {isBooked && (
                                    <span className="booked-x">×</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Final Confirmation */}
              <div
                className="booking-panel glass-card animate-in-up"
                style={{ animationDelay: "0.2s" }}
              >
                <h3>3. 予約を確定</h3>
                <div className="final-summary">
                  <div className="summary-item">
                    <label>日付</label>
                    <span>{selectedDateStr || "未選択"}</span>
                  </div>
                  <div className="summary-item">
                    <label>時間</label>
                    <span>{selectedSlot || "未選択"}</span>
                  </div>
                  <div className="summary-item">
                    <label>担当</label>
                    <span>
                      {advisors.find((a) => a.id === selectedAdvisorId)
                        ?.display_name || "未選択"}
                    </span>
                  </div>
                </div>
                <button
                  className="primary-btn launch-btn w-full mt-20"
                  disabled={
                    !selectedDateStr ||
                    !selectedSlot ||
                    !selectedAdvisorId ||
                    loading
                  }
                  onClick={handleBook}
                >
                  {loading ? "予約中..." : "この内容で予約する"}
                </button>
              </div>
            </div>
            <div className="booking-layout-placeholder" />{" "}
            {/* Removed redundant style tag */}
          </div>
        ) : (
          <div className="wizard-view">
            <header className="content-header fade-in">
              <div className="title-area">
                <h1>事業計画の作成</h1>
                <p className="welcome">
                  Step {step} / {TOTAL_STEPS}:{" "}
                  {step === 1
                    ? "基本情報・動機"
                    : step === 2
                      ? "経営者の略歴"
                      : step === 3
                        ? "事業内容(1)"
                        : step === 4
                          ? "事業内容(2)"
                          : step === 5
                            ? "組織・取引先"
                            : step === 6
                              ? "資金の使い道"
                              : step === 7
                                ? "調達方法と条件"
                                : step === 8
                                  ? "収支計画"
                                  : "その他"}
                </p>
              </div>
              <button className="text-btn" onClick={() => setView("dashboard")}>
                一時保存して戻る
              </button>
            </header>

            <div className="wizard-container glass-card animate-in-up">
              <div className="progress-stepper">
                {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(
                  (s) => (
                    <div
                      key={s}
                      className={`step-dot ${step >= s ? "active" : ""}`}
                    ></div>
                  ),
                )}
              </div>

              <div className="wizard-content">
                {step === 1 && (
                  <div className="step-body">
                    <div className="form-section">
                      <label>作成日</label>
                      <input
                        type="date"
                        className="input-field"
                        value={planData.create_date}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            create_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid-2 mt-20">
                      <div className="form-section">
                        <label>ふりがな</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="みだす たろう"
                          value={planData.name_kana}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              name_kana: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-section">
                        <label>お名前</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="三田須 太郎"
                          value={planData.name_full}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              name_full: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-section mt-32">
                      <label>1. 創業の動機（目的・動機） 300字程度で</label>
                      <p className="field-hint">
                        なぜこの事業を始めようと思ったのですか？背景や目的を具体的に記入してください。
                      </p>
                      <textarea
                        className="input-field"
                        rows={10}
                        value={planData.motivation}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            motivation: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="step-body">
                    <label>
                      2. 経営者の略歴（勤務先、担当業務、役職、技能・資格等）
                    </label>
                    <div className="cv-table-container mt-20">
                      <div className="table-header-grid">
                        <div className="col-year">年月</div>
                        <div className="col-content">内容</div>
                      </div>
                      {planData.cv_rows.map((row, idx) => (
                        <div key={idx} className="table-row-grid">
                          <input
                            type="text"
                            className="input-flush col-year"
                            placeholder="20XX年XX月"
                            value={row.date}
                            onChange={(e) => {
                              const newRows = [...planData.cv_rows];
                              newRows[idx].date = e.target.value;
                              setPlanData({ ...planData, cv_rows: newRows });
                            }}
                          />
                          <input
                            type="text"
                            className="input-flush col-content"
                            placeholder="株式会社〇〇 入社 営業部配属"
                            value={row.content}
                            onChange={(e) => {
                              const newRows = [...planData.cv_rows];
                              newRows[idx].content = e.target.value;
                              setPlanData({ ...planData, cv_rows: newRows });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="step-body">
                    <label>3. 事業内容（簡潔に）</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="誰に・どんな・どうやって商品やサービスを届けるか？"
                      value={planData.service_main}
                      onChange={(e) =>
                        setPlanData({
                          ...planData,
                          service_main: e.target.value,
                        })
                      }
                    />

                    <div className="form-section mt-24">
                      <label>①取り扱い商品・サービス等</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        value={planData.service_items}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            service_items: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="grid-2 mt-20">
                      <div className="form-section">
                        <label>②客単価</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="現時点で想定される金額"
                          value={planData.service_unit_price}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              service_unit_price: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-section">
                        <label>③営業日数</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="365-休日"
                          value={planData.service_days}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              service_days: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="step-body">
                    <div className="form-section">
                      <label>④セールスポイント</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={planData.service_strength}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            service_strength: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-section mt-24">
                      <label>
                        ⑤販売ターゲット・販売戦略について（集客について）
                      </label>
                      <textarea
                        className="input-field"
                        rows={4}
                        value={planData.service_strategy}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            service_strategy: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-section mt-24">
                      <label>⑥競合・市場調査の結果</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        value={planData.service_research}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            service_research: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="step-body">
                    <label>4. 組織体制</label>
                    <div className="grid-3 mt-12">
                      <div className="form-item">
                        <span className="sub-label">①従業員</span>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            className="input-field-compact"
                            value={planData.org_employees}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                org_employees: e.target.value,
                              })
                            }
                          />
                          <span>名</span>
                        </div>
                      </div>
                      <div className="form-item">
                        <span className="sub-label">②パート・アルバイト</span>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            className="input-field-compact"
                            value={planData.org_part_time}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                org_part_time: e.target.value,
                              })
                            }
                          />
                          <span>名</span>
                        </div>
                      </div>
                      <div className="form-item">
                        <span className="sub-label">③その他</span>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            className="input-field-compact"
                            value={planData.org_others}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                org_others: e.target.value,
                              })
                            }
                          />
                          <span>名</span>
                        </div>
                      </div>
                    </div>

                    <label className="mt-32">
                      5. 取引先・顧客・お客様の客層
                    </label>
                    <div className="form-section mt-12">
                      <span className="sub-label">①販売先</span>
                      <textarea
                        className="input-field"
                        rows={2}
                        value={planData.partners_sales}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            partners_sales: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-section mt-12">
                      <span className="sub-label">②仕入先</span>
                      <textarea
                        className="input-field"
                        rows={2}
                        value={planData.partners_supplier}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            partners_supplier: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-section mt-12">
                      <span className="sub-label">③外注先</span>
                      <textarea
                        className="input-field"
                        rows={2}
                        value={planData.partners_outsourcing}
                        onChange={(e) =>
                          setPlanData({
                            ...planData,
                            partners_outsourcing: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                )}

                {step === 6 && (
                  <div className="step-body">
                    <label>6. 必要な資金と調達方法（必要資金）</label>
                    <p className="field-hint">
                      何にいくらお金が必要か記入してください。（万円）
                    </p>

                    <div className="finance-table mt-12">
                      <div className="table-header-grid-3">
                        <div className="col-cat">区分</div>
                        <div className="col-item">内容（例：機械購入）</div>
                        <div className="col-amt">金額(万円)</div>
                      </div>
                      {[0, 1].map((i) => (
                        <div key={`equip-${i}`} className="table-row-grid-3">
                          <div className="col-cat-val">
                            {i === 0 ? "設備資金" : ""}
                          </div>
                          <input
                            type="text"
                            className="input-flush col-item"
                            value={planData.funds_equip_items[i].item}
                            onChange={(e) => {
                              const next = [...planData.funds_equip_items];
                              next[i].item = e.target.value;
                              setPlanData({
                                ...planData,
                                funds_equip_items: next,
                              });
                            }}
                          />
                          <input
                            type="number"
                            className="input-flush col-amt"
                            value={planData.funds_equip_items[i].amount}
                            onChange={(e) => {
                              const next = [...planData.funds_equip_items];
                              next[i].amount = e.target.value;
                              setPlanData({
                                ...planData,
                                funds_equip_items: next,
                              });
                            }}
                          />
                        </div>
                      ))}
                      {[0, 1].map((i) => (
                        <div key={`work-${i}`} className="table-row-grid-3">
                          <div className="col-cat-val">
                            {i === 0 ? "運転資金" : ""}
                          </div>
                          <input
                            type="text"
                            className="input-flush col-item"
                            value={planData.funds_work_items[i].item}
                            onChange={(e) => {
                              const next = [...planData.funds_work_items];
                              next[i].item = e.target.value;
                              setPlanData({
                                ...planData,
                                funds_work_items: next,
                              });
                            }}
                          />
                          <input
                            type="number"
                            className="input-flush col-amt"
                            value={planData.funds_work_items[i].amount}
                            onChange={(e) => {
                              const next = [...planData.funds_work_items];
                              next[i].amount = e.target.value;
                              setPlanData({
                                ...planData,
                                funds_work_items: next,
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 7 && (
                  <div className="step-body">
                    <label>6. 必要な資金と調達方法（調達方法）</label>
                    <div className="grid-2 mt-20">
                      <div className="form-section">
                        <label>自己資金</label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            className="input-field"
                            value={planData.finance_self}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                finance_self: e.target.value,
                              })
                            }
                          />
                          <span>万円</span>
                        </div>
                      </div>
                      <div className="form-section">
                        <label>金融機関からの借入</label>
                        <div className="input-with-unit">
                          <input
                            type="number"
                            className="input-field"
                            value={planData.finance_loan}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                finance_loan: e.target.value,
                              })
                            }
                          />
                          <span>万円</span>
                        </div>
                      </div>
                    </div>

                    <div className="loan-cond-card mt-32">
                      <span className="card-title">（借入条件）</span>
                      <div className="grid-3 mt-12">
                        <div className="form-item">
                          <span className="sub-label">区分(設備or運転)</span>
                          <input
                            type="text"
                            className="input-field-compact"
                            value={planData.finance_loan_cond.type}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                finance_loan_cond: {
                                  ...planData.finance_loan_cond,
                                  type: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="form-item">
                          <span className="sub-label">期間(年)</span>
                          <input
                            type="text"
                            className="input-field-compact"
                            value={planData.finance_loan_cond.period}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                finance_loan_cond: {
                                  ...planData.finance_loan_cond,
                                  period: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="form-item">
                          <span className="sub-label">金利(%)</span>
                          <input
                            type="text"
                            className="input-field-compact"
                            value={planData.finance_loan_cond.interest}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                finance_loan_cond: {
                                  ...planData.finance_loan_cond,
                                  interest: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 8 && (
                  <div className="step-body">
                    <label>7. 事業計画について（収支計画）</label>
                    <div className="outlook-table mt-16">
                      <div className="table-header-grid-outlook">
                        <div>項目</div>
                        <div>創業当初</div>
                        <div>1年後</div>
                        <div>数字の根拠</div>
                      </div>
                      <div className="table-row-grid-outlook header-row">
                        <span>①売上について（年間/万円）</span>
                      </div>
                      <div className="table-row-grid-outlook">
                        <span className="row-label">売上高</span>
                        <input
                          type="number"
                          className="input-flush"
                          value={planData.startup_sales}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              startup_sales: e.target.value,
                            })
                          }
                        />
                        <input
                          type="number"
                          className="input-flush"
                          value={planData.after1y_sales}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              after1y_sales: e.target.value,
                            })
                          }
                        />
                        <input
                          type="text"
                          className="input-flush"
                          value={planData.startup_basis}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              startup_basis: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="table-row-grid-outlook">
                        <span className="row-label">売上原価</span>
                        <input
                          type="number"
                          className="input-flush"
                          value={planData.startup_cost}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              startup_cost: e.target.value,
                            })
                          }
                        />
                        <input
                          type="number"
                          className="input-flush"
                          value={planData.after1y_cost}
                          onChange={(e) =>
                            setPlanData({
                              ...planData,
                              after1y_cost: e.target.value,
                            })
                          }
                        />
                        <span>-</span>
                      </div>
                      <div className="table-row-grid-outlook header-row">
                        <span>②経費について</span>
                      </div>
                      {[
                        {
                          lab: "人件費",
                          s: "startup_labor",
                          a: "after1y_labor",
                        },
                        { lab: "家賃", s: "startup_rent", a: "after1y_rent" },
                        {
                          lab: "支払利息",
                          s: "startup_interest",
                          a: "after1y_interest",
                        },
                        {
                          lab: "その他",
                          s: "startup_others",
                          a: "after1y_others",
                        },
                      ].map((item) => (
                        <div key={item.lab} className="table-row-grid-outlook">
                          <span className="row-label">{item.lab}</span>
                          <input
                            type="number"
                            className="input-flush"
                            value={String(
                              (planData as Record<string, unknown>)[item.s] ??
                                "",
                            )}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                [item.s]: e.target.value,
                              })
                            }
                          />
                          <input
                            type="number"
                            className="input-flush"
                            value={String(
                              (planData as Record<string, unknown>)[item.a] ??
                                "",
                            )}
                            onChange={(e) =>
                              setPlanData({
                                ...planData,
                                [item.a]: e.target.value,
                              })
                            }
                          />
                          <span>-</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {step === 9 && (
                  <div className="step-body">
                    <label>8. その他（特に相談時に聞きたい内容があれば）</label>
                    <textarea
                      className="input-field"
                      rows={12}
                      value={planData.other_requests}
                      onChange={(e) =>
                        setPlanData({
                          ...planData,
                          other_requests: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="wizard-actions">
                <button
                  className="text-btn"
                  onClick={handleStepBack}
                  disabled={step === 1}
                >
                  戻る
                </button>
                {step < TOTAL_STEPS ? (
                  <button className="primary-btn" onClick={handleStepNext}>
                    次へ進む
                  </button>
                ) : (
                  <button
                    className="primary-btn launch-btn"
                    onClick={() => {
                      alert(
                        "宇都宮市 創業計画書の全項目入力が完了しました！\nこの内容で計画書（PDF互換）を生成します。",
                      );
                      setView("dashboard");
                    }}
                  >
                    作成を完了する
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-root {
          display: flex;
          flex-direction: column; /* Mobile first: Vertical layout */
          min-height: 100vh;
          background: #f8fafc;
        }

        .side-nav {
          order: 2; /* Move to bottom on mobile */
          width: 100%;
          height: 70px;
          background: var(--bg-white);
          border-top: 1px solid var(--border-light);
          display: flex;
          flex-direction: row; /* Horizontal on mobile */
          align-items: center;
          justify-content: space-around;
          padding: 0 20px;
          position: fixed;
          bottom: 0;
          z-index: 100;
        }

        .brand-side {
          display: none; /* Hide brand icon in mobile bottom nav */
        }

        .nav-items {
          display: flex;
          flex-direction: row;
          gap: 20px;
          width: 100%;
          justify-content: space-around;
        }

        .nav-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .nav-icon:hover {
          background: var(--bg-soft);
          color: var(--primary);
        }

        .nav-icon.active {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .profile-trigger {
          display: none; /* Hide avatar here on mobile */
        }

        .main-content {
          order: 1;
          flex: 1;
          padding: 24px 16px 100px 16px; /* Extra bottom padding for mobile nav */
          width: 100%;
          max-width: 100%;
        }

        .content-header {
          display: flex;
          flex-direction: column; /* Stacked header on mobile */
          gap: 16px;
          margin-bottom: 32px;
          align-items: flex-start;
        }

        .header-actions {
          display: flex;
          width: 100%;
          gap: 12px;
        }

        .header-actions button {
          flex: 1;
        }

        .title-area h1 {
          font-size: 1.75rem;
          font-weight: 800;
        }

        .welcome {
          color: var(--text-dim);
          font-size: 0.85rem;
          margin-top: 4px;
        }

        .outline-btn {
          background: transparent;
          border: 1.5px solid var(--primary);
          color: var(--primary);
        }

        .outline-btn:hover {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr; /* Single column on mobile */
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          padding: 24px;
        }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .stat-icon-bg {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-soft);
        }

        .stat-label {
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          font-family: var(--font-accent);
          margin-bottom: 12px;
        }

        .progress-bar-flat {
          width: 100%;
          height: 6px;
          background: var(--bg-soft);
          border-radius: 3px;
          margin-bottom: 8px;
          overflow: hidden;
        }

        .progress-bar-flat .fill {
          height: 100%;
          background: var(--primary);
          border-radius: 3px;
        }

        .stat-hint {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .tasks-section {
          padding: 24px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .text-btn {
          border: none;
          background: transparent;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-light);
        }

        .activity-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--primary);
          margin-top: 4px;
        }

        .activity-desc {
          font-size: 0.9rem;
          font-weight: 500;
          margin-bottom: 2px;
        }

        .activity-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Booking / Wizard Common */
        .booking-view,
        .wizard-view {
          width: 100%;
        }
        .booking-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .booking-card,
        .wizard-container {
          padding: 24px;
          position: relative;
        }

        /* Wizard Specific */
        .progress-stepper {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }
        .step-dot {
          flex: 1;
          height: 4px;
          background: var(--bg-soft);
          border-radius: 2px;
          transition: background 0.3s ease;
        }

        .step-dot.active {
          background: var(--primary);
        }

        .wizard-content {
          margin-bottom: 32px;
        }

        .step-body label {
          display: block;
          font-weight: 800;
          font-size: 1rem;
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #fff3bf; /* Utsunomiya Form Yellow */
          border-radius: 4px;
          color: #2b2b2b;
        }

        .sub-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .form-section {
          position: relative;
        }

        /* Table Grid Styles */
        .cv-table-container,
        .finance-table,
        .outlook-table {
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
          background: white;
        }

        .table-header-grid,
        .table-row-grid,
        .table-header-grid-3,
        .table-row-grid-3,
        .table-header-grid-outlook,
        .table-row-grid-outlook {
          display: grid;
          border-bottom: 1px solid #eee;
        }

        .table-header-grid {
          grid-template-columns: 100px 1fr;
          background: #f8f9fa;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .table-row-grid {
          grid-template-columns: 100px 1fr;
        }

        .table-header-grid-3,
        .table-row-grid-3 {
          grid-template-columns: 100px 1fr 120px;
        }

        .table-header-grid-outlook,
        .table-row-grid-outlook {
          grid-template-columns: 120px 100px 100px 1fr;
        }

        .table-header-grid > div,
        .table-row-grid > div,
        .table-row-grid > span,
        .table-header-grid-3 > div,
        .table-row-grid-3 > div,
        .table-header-grid-outlook > div,
        .table-row-grid-outlook > div,
        .table-row-grid-outlook > span {
          padding: 10px;
          border-right: 1px solid #eee;
          display: flex;
          align-items: center;
        }

        .table-row-grid-outlook.header-row {
          background: #fff9e6;
          font-weight: 700;
          grid-template-columns: 1fr;
        }

        .col-cat-val {
          background: #fff9e6;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .input-flush {
          border: none;
          padding: 10px;
          width: 100%;
          font-size: 0.9rem;
          outline: none;
          background: transparent;
        }

        .input-flush:focus {
          background: #f0f7ff;
        }

        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .input-with-unit {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-with-unit span {
          font-size: 0.85rem;
          color: var(--text-dim);
          white-space: nowrap;
        }

        .input-field-compact {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .loan-cond-card {
          background: #f8fafc;
          border: 1px dashed var(--border-light);
          border-radius: 12px;
          padding: 16px;
        }

        .card-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .mt-12 {
          margin-top: 12px;
        }
        .mt-16 {
          margin-top: 16px;
        }
        .mt-20 {
          margin-top: 20px;
        }
        .mt-24 {
          margin-top: 24px;
        }
        .mt-32 {
          margin-top: 32px;
        }
        .step-dot.active {
          background: var(--primary);
        }

        .wizard-content {
          min-height: 250px; /* Ensure consistent height */
          margin-bottom: 32px;
        }
        .step-body label {
          display: block;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--secondary);
          font-size: 0.95rem;
        }
        .mt-20 {
          margin-top: 20px;
        }
        .wizard-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .calendar-header {
          margin-bottom: 24px;
        }

        .calendar-subtext {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .weekday-label {
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-dim);
          padding: 8px 0;
        }

        .date-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
          font-size: 0.9rem;
          color: var(--secondary);
        }

        .date-cell:hover {
          background: var(--bg-soft);
          border-color: var(--border-light);
        }

        .date-cell.active {
          background: var(--primary);
          color: #fff;
          box-shadow: 0 4px 12px rgba(0, 102, 255, 0.2);
        }

        .slots-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 20px;
        }

        .slot-btn {
          padding: 14px;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          background: var(--bg-white);
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slot-btn:hover:not(:disabled) {
          border-color: var(--primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }

        .slot-btn.active {
          background: var(--primary-soft);
          border-color: var(--primary);
          color: var(--primary);
        }

        .slot-btn.booked {
          background: #f1f5f9;
          color: #94a3b8;
          border-color: #e2e8f0;
          cursor: not-allowed;
          font-weight: 400;
        }

        .booked-mark {
          font-size: 1.2rem;
          font-weight: 800;
          color: #ef4444;
          line-height: 1;
        }

        .empty-state {
          margin-top: 16px;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-style: italic;
        }

        .summary-details {
          margin: 16px 0 24px 0;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px dotted var(--border-light);
        }
        .detail-item .label {
          color: var(--text-dim);
          font-size: 0.85rem;
        }
        .detail-item .val {
          font-weight: 600;
          color: var(--secondary);
          font-size: 0.85rem;
        }

        .launch-btn {
          width: 100%;
          font-size: 1rem;
          padding: 14px;
          margin-top: 8px;
        }

        @keyframes animateUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in-up {
          animation: animateUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        /* Desktop Breakpoint */
        @media (min-width: 900px) {
          .dashboard-root {
            flex-direction: row;
          }

          .side-nav {
            order: 0;
            width: 80px;
            height: 100vh;
            flex-direction: column;
            border-top: none;
            border-right: 1px solid var(--border-light);
            position: sticky;
            top: 0;
            padding: 24px 0;
          }

          .brand-side {
            display: flex;
            margin-bottom: 60px;
          }

          .nav-items {
            flex-direction: column;
            gap: 20px;
            width: auto;
          }

          .profile-trigger {
            display: flex;
            margin-top: auto;
          }

          .avatar-small {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ddd, #eee);
          }

          .main-content {
            padding: 48px 60px;
            max-width: 1100px;
          }

          .content-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 48px;
          }

          .header-actions {
            width: auto;
          }

          .title-area h1 {
            font-size: 2.25rem;
          }

          .outline-btn {
            width: auto;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            margin-bottom: 32px;
          }

          .booking-grid {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 24px;
          }

          .confirm-section {
            grid-column: span 2;
          }

          .calendar-grid {
            grid-template-columns: repeat(7, 1fr);
            gap: 12px;
          }

          .date-btn {
            padding: 16px 8px;
          }

          .slots-grid {
            gap: 12px;
          }

          .slot-btn {
            padding: 14px;
          }

          .wizard-container {
            padding: 48px;
          }
        }

        /* Responsive Auth adjustments */
        @media (max-width: 480px) {
          .auth-card {
            padding: 24px;
          }
          .brand h1 {
            font-size: 1.5rem;
          }
        }

        .total-display {
          padding: 16px;
          background: var(--bg-soft);
          border-radius: 12px;
          text-align: right;
          font-weight: 800;
          color: var(--primary);
          font-size: 1.1rem;
        }

        .field-hint {
          font-size: 0.8rem;
          color: var(--text-dim);
          margin-bottom: 12px;
          line-height: 1.4;
        }

        .info-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: #fff9db;
          padding: 8px 12px;
          border-radius: 6px;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .result-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          background: var(--primary);
          border-radius: 16px;
          color: #fff;
          box-shadow: 0 10px 20px rgba(0, 102, 255, 0.2);
        }

        .result-card .price {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .booking-layout {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 100px;
        }
        .available-dates-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 12px;
        }
        .date-option-card {
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .date-option-card:hover {
          border-color: var(--primary);
          background: var(--primary-soft);
        }
        .date-option-card.active {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
        }
        .date-val {
          font-weight: 800;
          font-size: 1.1rem;
        }
        .time-range {
          font-size: 0.75rem;
          opacity: 0.8;
        }
        .advisors-slots-area {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }
        .advisor-slots-row {
          background: #f8fafc;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .advisor-mini-profile {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .avatar-xs {
          width: 24px;
          height: 24px;
          background: var(--primary-soft);
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
        }
        .advisor-name {
          font-weight: 700;
          font-size: 0.9rem;
        }
        .slots-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .mini-slot-btn {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
        }
        .mini-slot-btn:hover:not(:disabled) {
          border-color: var(--accent);
          color: var(--accent);
        }
        .mini-slot-btn.active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }
        .mini-slot-btn.booked {
          background: #f1f5f9;
          color: #cbd5e1;
          cursor: not-allowed;
        }
        .booked-x {
          font-size: 10px;
          color: #ef4444;
          margin-left: 4px;
        }
        .final-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #f1f5f9;
          padding: 16px;
          border-radius: 12px;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .summary-item label {
          color: var(--text-dim);
          font-weight: 600;
        }
        .summary-item span {
          font-weight: 800;
          color: var(--secondary);
        }

        @keyframes animateUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-in-up {
          animation: animateUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
