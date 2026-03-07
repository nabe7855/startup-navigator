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
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Consolidate auth logic
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          await fetchUserProfile(session.user.id, session.user.email!);
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    initializeAuth();

    // Safety timeout: stop loading after 10 seconds no matter what
    const timeout = setTimeout(() => {
      if (mounted) {
        // Use functional update or just set false. Functional is safer against stale check.
        setAuthChecking((prev) => {
          if (prev) console.warn("Auth check safety timeout fired");
          return false;
        });
      }
    }, 10000);

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: any, session) => {
      console.log("Auth event:", event);
      if (!mounted) return;

      if (session) {
        await fetchUserProfile(session.user.id, session.user.email!);
        setAuthChecking(false);
      } else {
        setUser(null);
        lastFetchedId.current = null;
        setAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, email: string) => {
    // Deduplicate: don't fetch if we already have a session for this user OR if fetch is in progress
    if (lastFetchedId.current === userId) {
      return;
    }
    lastFetchedId.current = userId;

    console.log("Fetching profile for:", userId);

    // Create a promise that rejects after 8 seconds
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Profile fetch timeout")), 8000),
    );

    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      const { data, error } = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.warn(
          `Profile fetch error (${error.code || "unknown"}):`,
          error.message || error,
        );
      }

      const role = data?.role || "user";
      console.log("Setting user with role:", role);
      setUser({ email, id: userId, role });
    } catch (e: any) {
      if (e.message === "Profile fetch timeout") {
        console.warn("Profile fetch timed out, falling back to 'user' role");
      } else {
        console.warn("fetchUserProfile failed:", e);
      }
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
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [userPlans, setUserPlans] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);

  useEffect(() => {
    if (view === "booking") {
      void loadBookingData();
    }
    if (view === "dashboard" && user?.id) {
      void loadUserBookings();
      void loadPlanData();
    }
  }, [view, user?.id]);

  const loadPlanData = async () => {
    if (!user?.id) return;
    // Load all plans for the user
    const { data: plans } = await supabase
      .from("business_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (plans && plans.length > 0) {
      setUserPlans(plans);
      // For the wizard, just use the first/latest one for now to maintain consistency
      setPlanData(plans[0].plan_data as any);

      // Load comments for these plans
      const planIds = plans.map((p: any) => p.id);
      const { data: comments } = await supabase
        .from("plan_comments")
        .select("*, profiles(display_name)")
        .in("plan_id", planIds)
        .order("created_at", { ascending: false });

      if (comments) setRecentComments(comments);
    }
  };

  const loadUserBookings = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("bookings")
      .select("*, profiles:advisor_id (display_name)")
      .eq("user_id", user.id)
      .order("booking_date", { ascending: false });
    if (data) setUserBookings(data);
  };

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
    } catch (error: any) {
      console.error(error);
      let msg =
        error instanceof Error ? error.message : "エラーが発生しました。";
      if (msg === "Invalid login credentials" && isLogin) {
        msg =
          "ログインに失敗しました。メールアドレスまたはパスワードが間違っています。\n\n※ 招待された担当者の方は、まだアカウントが作成されていません。左の「新規登録」タブから、管理者と同じメールアドレス・パスワードを入力して登録してください。";
      }
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
              {isLogin && (
                <p className="field-hint text-xs mt-1">
                  ※
                  招待された担当者の方は、初回のみ「新規登録」タブから登録が必要です。
                </p>
              )}
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
            border-radius: 14px;
            box-shadow: 0 4px 12px var(--primary-glow);
          }
          .primary-btn:active {
            transform: scale(0.98);
          }
          .launch-btn {
            background: linear-gradient(
              135deg,
              var(--primary) 0%,
              #1d4ed8 100%
            );
            border: none;
            color: white;
            font-weight: 800;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .launch-btn:hover {
            box-shadow: 0 8px 20px var(--primary-glow);
          }
          .session-history {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
          }
          .session-row {
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .s-date {
            font-weight: 800;
            font-size: 1.1rem;
            margin-bottom: 4px;
          }
          .s-info {
            display: flex;
            gap: 12px;
            align-items: center;
            margin-bottom: 8px;
          }
          .s-advisor {
            font-size: 0.85rem;
            color: #64748b;
            font-weight: 700;
          }
          .s-result {
            padding: 2px 10px;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 800;
          }
          .s-result.pass {
            background: #dcfce7;
            color: #166534;
          }
          .s-result.fail {
            background: #fee2e2;
            color: #991b1b;
          }
          .s-result.pending {
            background: #f1f5f9;
            color: #475569;
          }
          .s-comment {
            font-size: 0.85rem;
            background: #fff;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid var(--primary);
          }
          .s-comment p {
            margin: 0;
            line-height: 1.5;
          }

          .business-plan-summary {
            padding: 32px;
            margin-top: 32px;
          }
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .summary-item h4 {
            font-size: 0.9rem;
            font-weight: 800;
            color: var(--primary);
            margin-bottom: 8px;
          }
          .summary-item p {
            font-size: 0.9rem;
            line-height: 1.6;
            white-space: pre-wrap;
            margin: 0;
          }
          .summary-footer {
            margin-top: 32px;
            font-size: 0.8rem;
            color: #94a3b8;
            text-align: center;
          }

          @media print {
            .no-print,
            .side-nav,
            .content-header,
            .stats-grid,
            .tasks-section {
              display: none !important;
            }
            .dashboard-root {
              background: white !important;
              padding: 0 !important;
            }
            .main-content {
              margin: 0 !important;
              padding: 0 !important;
            }
            .business-plan-summary {
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              width: 100% !important;
            }
            .glass-card::before {
              display: none;
            }
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
                    <CheckCircle size={18} color="#10b981" />
                  </div>
                  <span className="stat-label">合格数</span>
                </div>
                <div className="stat-value">
                  {
                    userBookings.filter((b) => b.evaluation_result === "pass")
                      .length
                  }
                </div>
                <p className="stat-hint">目標達成まであと少しです</p>
              </div>
            </div>

            <section
              className="glass-card animate-in-up"
              style={{ animationDelay: "0.2s", marginBottom: "32px" }}
            >
              <div className="section-header">
                <h3 className="section-title">セッション履歴・判定</h3>
              </div>
              <div className="session-history">
                {userBookings.length === 0 ? (
                  <p className="empty-hint">まだセッション履歴はありません。</p>
                ) : (
                  userBookings.map((b) => (
                    <div key={b.id} className="session-row">
                      <div className="s-date">{b.booking_date}</div>
                      <div className="s-info">
                        <span className="s-advisor">
                          担当: {b.profiles?.display_name || "担当者"}
                        </span>
                        <span className={`s-result ${b.evaluation_result}`}>
                          {b.evaluation_result === "pass"
                            ? "合格"
                            : b.evaluation_result === "fail"
                              ? "不合格"
                              : "受講中/未公表"}
                        </span>
                      </div>
                      {b.advisor_comment && (
                        <div className="s-comment">
                          <p>
                            <strong>講師コメント:</strong> {b.advisor_comment}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section
              className="business-plan-summary glass-card animate-in-up print-section"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="section-header">
                <h2 className="section-title">📖 事業計画書サマリー</h2>
                <button
                  className="primary-btn outline-btn no-print"
                  onClick={() => window.print()}
                >
                  PDFエクスポート
                </button>
              </div>

              <div className="summary-grid">
                <div className="summary-item">
                  <h4>創業の動機</h4>
                  <p>{planData.motivation || "未入力"}</p>
                </div>
                <div className="summary-item">
                  <h4>事業内容</h4>
                  <p>{planData.service_main || "未入力"}</p>
                </div>
                <div className="summary-item">
                  <h4>セールスポイント</h4>
                  <p>{planData.service_strength || "未入力"}</p>
                </div>
                <div className="summary-item">
                  <h4>販売ターゲット・戦略</h4>
                  <p>{planData.service_strategy || "未入力"}</p>
                </div>
              </div>
              <p className="summary-footer">
                ※ 全ての内容は計画書作成ウィザードから編集可能です。
              </p>
            </section>
            <section
              className="tasks-section glass-card animate-in-up"
              style={{ animationDelay: "0.4s", marginBottom: "32px" }}
            >
              <div className="section-header">
                <h3 className="section-title">
                  <span className="icon">🚀</span> 最近の活動
                </h3>
              </div>
              <div className="activity-list">
                {userBookings.slice(0, 3).map((b) => (
                  <div key={b.id} className="activity-item">
                    <CheckCircle
                      size={16}
                      color={
                        b.status === "confirmed" ? "var(--accent)" : "#94a3b8"
                      }
                    />
                    <div className="activity-info">
                      <p className="activity-desc">
                        {b.booking_date} のセッション (
                        {b.status === "confirmed" ? "予約確定" : "完了"})
                      </p>
                      <span className="activity-time">{b.start_time}〜</span>
                    </div>
                  </div>
                ))}
                {userBookings.length === 0 && (
                  <p className="empty-hint">アクティビティはありません。</p>
                )}
              </div>

              <div className="notifications-sub-section mt-32">
                <h4
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-dim)",
                    marginBottom: "16px",
                    borderBottom: "1px solid #eee",
                    paddingBottom: "8px",
                  }}
                >
                  🔔 おしらせ
                </h4>
                <div className="notification-list">
                  {recentComments.slice(0, 2).map((c) => (
                    <div key={c.id} className="notification-item">
                      <div className="notif-dot"></div>
                      <p>
                        <strong>{c.profiles?.display_name || "担当者"}</strong>{" "}
                        から計画書にコメントが届きました。
                      </p>
                    </div>
                  ))}
                  {userBookings
                    .filter(
                      (b) =>
                        b.evaluation_result &&
                        b.evaluation_result !== "pending",
                    )
                    .slice(0, 2)
                    .map((b) => (
                      <div
                        key={`notif-eval-${b.id}`}
                        className="notification-item"
                      >
                        <div className="notif-dot blue"></div>
                        <p>
                          {b.booking_date} のセッション判定が出ました（
                          {b.evaluation_result === "pass" ? "合格" : "不合格"}
                          ）。
                        </p>
                      </div>
                    ))}
                  {recentComments.length === 0 &&
                    userBookings.filter(
                      (b) =>
                        b.evaluation_result &&
                        b.evaluation_result !== "pending",
                    ).length === 0 && (
                      <p className="empty-hint">新着のおしらせはありません。</p>
                    )}
                </div>
              </div>
            </section>

            <section
              className="glass-card animate-in-up"
              style={{ animationDelay: "0.5s", marginBottom: "32px" }}
            >
              <div className="section-header">
                <h3 className="section-title">📖 事業計画書一覧</h3>
              </div>
              <div className="plan-list-dashboard">
                {userPlans.length === 0 ? (
                  <p className="empty-hint">作成済みの計画書はありません。</p>
                ) : (
                  userPlans.map((p) => (
                    <div key={p.id} className="plan-card-mini">
                      <div className="p-header">
                        <span className="p-date">
                          最終更新:{" "}
                          {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                        <Rocket size={16} color="var(--primary)" />
                      </div>
                      <div className="p-content">
                        <h4>{p.plan_data?.motivation?.substring(0, 20)}...</h4>
                        <div className="p-feedback">
                          <h5>担当者からのフィードバック:</h5>
                          {recentComments.filter((c) => c.plan_id === p.id)
                            .length > 0 ? (
                            <div className="p-comments">
                              {recentComments
                                .filter((c) => c.plan_id === p.id)
                                .slice(0, 2)
                                .map((c) => (
                                  <p key={c.id} className="mini-comment">
                                    「{c.comment_text.substring(0, 50)}
                                    {c.comment_text.length > 50 ? "..." : ""}」
                                  </p>
                                ))}
                            </div>
                          ) : (
                            <p className="mini-hint">
                              まだコメントはありません。
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section
              className="glass-card animate-in-up"
              style={{ animationDelay: "0.6s", marginBottom: "32px" }}
            >
              <div className="section-header">
                <h3 className="section-title">📅 受講履歴</h3>
              </div>
              <div className="course-history-list">
                {userBookings.length === 0 ? (
                  <p className="empty-hint">受講履歴はありません。</p>
                ) : (
                  userBookings.map((b) => (
                    <div key={b.id} className="history-row">
                      <div className="h-main">
                        <span className="h-date">{b.booking_date}</span>
                        <span className="h-time">{b.start_time}〜</span>
                      </div>
                      <div className="h-meta">
                        <span
                          className={`s-result ${b.evaluation_result || "pending"}`}
                        >
                          {b.evaluation_result === "pass"
                            ? "合格"
                            : b.evaluation_result === "fail"
                              ? "不合格"
                              : "受講中"}
                        </span>
                        <span className="h-advisor">
                          担当: {b.profiles?.display_name || "担当者"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
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
              <div className="header-actions">
                <button
                  className="primary-btn outline-btn"
                  onClick={() => setView("dashboard")}
                >
                  戻る
                </button>
              </div>
            </header>
            <div className="booking-layout">
              {/* 1. Date Selection */}
              <div className="booking-panel glass-card animate-in-up">
                <div className="panel-header">
                  <div className="panel-num">1</div>
                  <h3>日時を選択</h3>
                </div>
                <div className="available-dates-list">
                  {availableHours.length === 0 ? (
                    <p className="empty-hint">現在予約可能な日はありません。</p>
                  ) : (
                    availableHours.map((h) => {
                      const dateObj = new Date(h.date.replace(/-/g, "/"));
                      const dayOfWeek = dateObj.getDay();
                      const activeAdvisorIds = advisors.map((a) => a.id);
                      const hasShift = advisorSchedules.some(
                        (s) =>
                          activeAdvisorIds.includes(s.advisor_id) &&
                          s.day_of_week === dayOfWeek,
                      );

                      return (
                        <button
                          key={h.id}
                          className={`date-option-card ${selectedDateStr === h.date ? "active" : ""} ${!hasShift ? "disabled-card" : ""}`}
                          disabled={!hasShift}
                          onClick={() => {
                            setSelectedDateStr(h.date);
                            setSelectedSlot(null);
                            setSelectedAdvisorId(null);
                          }}
                        >
                          <span className="date-val-month">
                            {dateObj.getMonth() + 1}月
                          </span>
                          <span className="date-val-day">
                            {dateObj.getDate()}
                          </span>
                          <span className="date-val-year">
                            {h.date.split("-")[0]}
                          </span>
                          <div className="date-option-footer">
                            {hasShift ? (
                              <span className="time-range-hint">予約可能</span>
                            ) : (
                              <span className="time-range-hint status-off">
                                担当者不在
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Advisor & Slot Selection */}
              <div
                className="booking-panel glass-card animate-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                <div className="panel-header">
                  <div className="panel-num">2</div>
                  <h3>担当者と時間を選択</h3>
                </div>
                {!selectedDateStr ? (
                  <div className="empty-selection-placeholder">
                    <Calendar size={32} />
                    <p>先に日付を選択してください</p>
                  </div>
                ) : (
                  <div className="advisors-slots-area">
                    {advisors.length === 0 && (
                      <p className="empty-hint">担当者が登録されていません。</p>
                    )}
                    {advisors.map((advisor) => {
                      const dayOfWeek = new Date(selectedDateStr).getDay();
                      const schedule = advisorSchedules.find(
                        (s) =>
                          s.advisor_id === advisor.id &&
                          s.day_of_week === dayOfWeek,
                      );

                      if (!schedule) return null;

                      const startHour = parseInt(
                        schedule.start_time.split(":")[0],
                      );
                      const endHour = parseInt(schedule.end_time.split(":")[0]);
                      const slots = [];
                      for (let i = startHour; i < endHour; i++) {
                        slots.push(`${i}:00`);
                      }

                      return (
                        <div key={advisor.id} className="advisor-booking-card">
                          <div className="advisor-header">
                            <div className="advisor-avatar-circle">
                              {advisor.display_name?.[0] || "?"}
                            </div>
                            <div className="advisor-meta">
                              <span className="advisor-name-label">
                                {advisor.display_name}
                              </span>
                              <span className="advisor-role-label">
                                アドバイザー
                              </span>
                            </div>
                          </div>
                          <div className="slots-grid">
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
                                  className={`slot-chip ${isBooked ? "booked" : isSelected ? "active" : ""}`}
                                  disabled={isBooked}
                                  onClick={() => {
                                    setSelectedSlot(s);
                                    setSelectedAdvisorId(advisor.id);
                                  }}
                                >
                                  {s}
                                  {isBooked ? (
                                    <span className="slot-status">満枠</span>
                                  ) : (
                                    <span className="slot-status">空き</span>
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
                <div className="panel-header">
                  <div className="panel-num">3</div>
                  <h3>予約を確定</h3>
                </div>
                <div className="final-summary-card">
                  <div className="summary-row">
                    <label>日付</label>
                    <strong>{selectedDateStr || "未選択"}</strong>
                  </div>
                  <div className="summary-row">
                    <label>時間</label>
                    <strong>{selectedSlot || "未選択"}</strong>
                  </div>
                  <div className="summary-row">
                    <label>担当</label>
                    <strong>
                      {advisors.find((a) => a.id === selectedAdvisorId)
                        ?.display_name || "未選択"}
                    </strong>
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
                      <div className="table-inner">
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
                      <div className="table-inner">
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
                          <div
                            key={item.lab}
                            className="table-row-grid-outlook"
                          >
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
                    onClick={async () => {
                      setLoading(true);
                      const { error } = await supabase
                        .from("business_plans")
                        .upsert(
                          {
                            user_id: user.id,
                            plan_data: planData,
                            updated_at: new Date().toISOString(),
                          },
                          { onConflict: "user_id" },
                        );

                      setLoading(false);
                      if (error) {
                        alert("保存に失敗しました: " + error.message);
                      } else {
                        alert("事業計画書を保存しました！");
                        setView("dashboard");
                        void loadPlanData();
                      }
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
        /* Base Dashboard Styles */
        .dashboard-root {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #f8fafc;
        }

        /* Responsive Sidebar / Nav */
        .side-nav {
          order: 2;
          width: 100%;
          height: 70px;
          background: var(--bg-white);
          border-top: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 16px;
          position: fixed;
          bottom: 0;
          left: 0;
          z-index: 100;
        }

        .brand-side {
          display: none;
        }
        .nav-items {
          display: flex;
          width: 100%;
          justify-content: space-around;
          gap: 12px;
        }

        .nav-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .nav-icon.active {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .main-content {
          order: 1;
          flex: 1;
          padding: 24px 16px 100px 16px;
          width: 100%;
          margin: 0 auto;
        }

        /* Section Layouts */
        .content-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }
        .header-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        .glass-card {
          padding: 24px;
          border-radius: 20px;
        }

        .stat-card {
          /* Uses base glass-card padding */
        }
        .stat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .stat-icon-bg {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg-soft);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: var(--secondary);
          margin: 0;
        }
        .stat-hint {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-top: 8px;
        }

        .progress-bar-flat {
          width: 100%;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
          margin: 12px 0 8px 0;
        }
        .progress-bar-flat .fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.3s;
        }

        .outline-btn {
          background: transparent !important;
          border: 1px solid var(--primary) !important;
          color: var(--primary) !important;
          box-shadow: none !important;
        }
        .outline-btn:hover {
          background: var(--primary-soft) !important;
        }

        /* Business Plan Summary Specific Fixes */
        .business-plan-summary {
          /* Uses base glass-card padding */
        }
        .summary-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-light);
        }
        .summary-item:last-child {
          border-bottom: none;
        }
        .summary-item h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          margin: 0;
        }
        .summary-item p {
          font-size: 0.95rem;
          color: var(--secondary);
          line-height: 1.6;
          margin: 0;
          word-break: break-word;
        }

        /* Wizard Specific */
        .wizard-container {
          padding: 24px;
          border-radius: 20px;
        }
        .progress-stepper {
          display: flex;
          gap: 8px;
          margin-bottom: 32px;
        }
        .step-dot {
          flex: 1;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
        }
        .step-dot.active {
          background: var(--primary);
        }

        .step-body label {
          display: block;
          font-weight: 700;
          padding: 12px 16px;
          background: #fff3bf;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 0.95rem;
          color: #854d0e;
        }

        /* Form Tables - Horizontal Scroll on Mobile */
        .cv-table-container,
        .finance-table,
        .outlook-table {
          width: 100%;
          overflow-x: auto;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 24px;
          -webkit-overflow-scrolling: touch;
        }
        .table-inner {
          min-width: 600px;
        }
        .table-header-grid {
          background: #f8fafc;
          font-weight: 700;
          grid-template-columns: 120px 1fr;
        }
        .table-inner div {
          padding: 12px;
          border-right: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
        }
        .input-flush {
          border: none;
          width: 100%;
          outline: none;
          background: transparent;
        }

        .table-header-grid,
        .table-row-grid,
        .table-row-grid-3,
        .table-row-grid-outlook {
          display: grid;
          border-bottom: 1px solid #f1f5f9;
        }
        .table-row-grid {
          grid-template-columns: 120px 1fr;
        }
        .table-row-grid-3 {
          grid-template-columns: 120px 1fr 120px;
        }
        .table-row-grid-outlook {
          grid-template-columns: 140px 100px 100px 1fr;
        }

        /* Booking UI Premium Refactor */
        .booking-panel {
          padding: 24px;
          border-radius: 20px;
          margin-bottom: 24px;
        }
        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .panel-num {
          width: 28px;
          height: 28px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
        }
        .panel-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        /* 1. Date List */
        .available-dates-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }
        .date-option-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
          background: white;
          border: 2px solid var(--bg-soft);
          border-radius: 16px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .date-option-card:hover {
          border-color: var(--primary-soft);
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        .date-option-card.active {
          border-color: var(--primary);
          background: var(--primary-soft);
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .date-val-month {
          font-size: 0.75rem;
          color: var(--text-dim);
          font-weight: 600;
        }
        .date-val-day {
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--secondary);
          line-height: 1.2;
        }
        .date-val-year {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .date-option-footer {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid var(--bg-soft);
          width: 100%;
        }
        .time-range-hint {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--accent);
          background: #ecfdf5;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* 2. Advisor & Slots */
        .empty-selection-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-muted);
          gap: 12px;
          text-align: center;
        }
        .advisors-slots-area {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .advisor-booking-card {
          background: var(--bg-soft);
          padding: 20px;
          border-radius: 16px;
        }
        .advisor-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .advisor-avatar-circle {
          width: 44px;
          height: 44px;
          background: white;
          color: var(--primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
        }
        .advisor-meta {
          display: flex;
          flex-direction: column;
        }
        .advisor-name-label {
          font-weight: 700;
          font-size: 1rem;
          color: var(--secondary);
        }
        .advisor-role-label {
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 8px;
        }
        .slot-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 4px;
          background: white;
          border: 1px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .slot-chip:hover:not(:disabled) {
          border-color: var(--primary);
          transform: scale(1.05);
          box-shadow: var(--shadow-sm);
        }
        .slot-chip.active {
          background: var(--primary);
          color: white;
          transform: scale(1.05);
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .slot-chip.booked {
          background: #f1f5f9;
          color: var(--text-muted);
          opacity: 0.6;
          cursor: not-allowed;
        }
        .time-range-hint.status-off {
          color: var(--text-muted);
          background: #f1f5f9;
        }
        .date-option-card.disabled-card {
          opacity: 0.6;
          cursor: not-allowed;
          border-color: #eee;
        }
        .date-option-card.disabled-card:hover {
          transform: none;
          box-shadow: none;
          border-color: #eee;
        }

        /* 3. Final Summary */
        .final-summary-card {
          background: white;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--bg-soft);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }
        .summary-row label {
          color: var(--text-dim);
        }
        .summary-row strong {
          color: var(--secondary);
          font-weight: 700;
        }

        /* Session History */
        .session-history {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .session-row {
          background: #fff;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--border-light);
        }
        .s-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 12px 0;
        }
        .s-result {
          font-size: 0.75rem;
          padding: 4px 12px;
          border-radius: 99px;
          font-weight: 700;
        }
        .s-result.pass {
          background: #dcfce7;
          color: #166534;
        }
        .s-result.fail {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Recent Activity */
        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 8px;
        }
        .activity-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .activity-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--primary);
          margin-top: 6px;
          flex-shrink: 0;
        }
        .activity-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .activity-desc {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--secondary);
          margin: 0;
        }
        .activity-time {
          font-size: 0.75rem;
          color: var(--text-dim);
        }

        /* Update styles for Dashboard */
        .notification-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: #fdf2f8;
          border-radius: 12px;
          margin-bottom: 8px;
          font-size: 0.85rem;
        }
        .notif-dot {
          width: 8px;
          height: 8px;
          background: #db2777;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .notif-dot.blue {
          background: #2563eb;
        }

        .plan-list-dashboard {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        .plan-card-mini {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
        }
        .p-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 0.75rem;
          color: var(--text-dim);
        }
        .p-content h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          color: var(--secondary);
        }
        .p-feedback h5 {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .mini-comment {
          font-size: 0.8rem;
          background: white;
          padding: 8px 12px;
          border-radius: 8px;
          border-left: 3px solid var(--primary);
          margin-bottom: 6px;
        }

        .course-history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .history-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .h-date {
          font-weight: 800;
          margin-right: 12px;
        }
        .h-time {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .h-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .h-advisor {
          font-size: 0.7rem;
          color: var(--text-dim);
        }

        /* Desktop Adjustments (900px+) */
        @media (min-width: 900px) {
          .dashboard-root {
            flex-direction: row;
          }
          .side-nav {
            order: 0;
            width: 80px;
            height: 100vh;
            flex-direction: column;
            top: 0;
            padding: 32px 0;
            border-top: none;
            border-right: 1px solid var(--border-light);
            position: sticky;
          }
          .nav-items {
            flex-direction: column;
            width: auto;
          }
          .brand-side {
            display: flex;
            margin-bottom: 48px;
          }
          .main-content {
            padding: 48px 60px;
            max-width: 1200px;
          }
          .content-header {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-end;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }
          .summary-item {
            border-bottom: none;
          }
          .booking-layout {
            display: grid;
            grid-template-columns: 1.5fr 1fr;
            gap: 24px;
          }
          .wizard-container {
            padding: 40px;
          }
          .section-title {
            font-size: 1.5rem;
          }
        }

        /* Print Mode */
        @media print {
          .no-print,
          .side-nav {
            display: none !important;
          }
          .main-content {
            padding: 0 !important;
          }
          .glass-card {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
        }

        @keyframes fadeIn {
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
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
