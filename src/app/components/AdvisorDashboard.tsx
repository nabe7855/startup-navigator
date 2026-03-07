"use client";

import { supabase } from "@/lib/supabase";
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Save,
  User,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type AdvisorTab = "profile" | "schedule" | "bookings";

type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  user_id: string;
  user_email?: string;
  plan_id?: string;
  advisor_comment?: string;
  internal_report?: string;
  evaluation_result?: "pass" | "fail" | "pending";
  profiles?: { display_name: string };
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
  const pathname = usePathname() || "";
  const router = useRouter();

  let tab: AdvisorTab = "bookings";
  if (pathname.includes("/advisor/schedule")) tab = "schedule";
  else if (pathname.includes("/advisor/profile")) tab = "profile";

  const [profile, setProfile] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
  });

  // Specific-date schedules
  const [dailySchedules, setDailySchedules] = useState<any[]>([]);

  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const timeBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [newHour, setNewHour] = useState({
    start_time: "10:00",
    end_time: "18:00",
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [planData, setPlanData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [sessionReport, setSessionReport] = useState({
    advisor_comment: "",
    internal_report: "",
    evaluation_result: "pending" as "pass" | "fail" | "pending",
  });
  const [operatingHours, setOperatingHours] = useState<any[]>([]);

  const adminSlot = selectedDate
    ? operatingHours.find((h) => h.date === selectedDate)
    : null;

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (data)
      setProfile({
        display_name: data.display_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      });
  };

  const loadSchedules = async () => {
    // 運営側の営業日程設定画面と連携するため、新しく advisor_daily_schedules テーブルを使用します
    // テーブルが存在しない場合エラーにならないように maybeSingle または空配列として処理
    const { data, error } = await supabase
      .from("advisor_daily_schedules")
      .select("*")
      .eq("advisor_id", userId);

    if (!error && data) {
      setDailySchedules(data);
    }
  };

  const loadBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("*, profiles:user_id (display_name)")
      .eq("advisor_id", userId)
      .order("booking_date", { ascending: false });
    if (data) setBookings(data as any[]);
  };

  const loadOperatingHours = async () => {
    const { data } = await supabase
      .from("operating_hours")
      .select("*")
      .order("date");
    if (data) setOperatingHours(data);
  };

  useEffect(() => {
    void (async () => {
      await loadProfile();
      await loadSchedules();
      await loadBookings();
      await loadOperatingHours();
    })();
  }, [userId]);

  const saveDailySchedule = async () => {
    if (!selectedDate) return;
    setSaving(true);
    const { error } = await supabase.from("advisor_daily_schedules").upsert(
      {
        advisor_id: userId,
        date: selectedDate,
        start_time: newHour.start_time + ":00",
        end_time: newHour.end_time + ":00",
      },
      { onConflict: "advisor_id, date" },
    );
    if (error)
      alert(
        "保存に失敗しました。データベースにテーブルが存在するか確認してください。：" +
          error.message,
      );
    else {
      alert("設定を保存しました。");
      await loadSchedules();
    }
    setSaving(false);
  };

  const removeDailySchedule = async () => {
    if (!selectedDate) return;
    setSaving(true);
    const { error } = await supabase
      .from("advisor_daily_schedules")
      .delete()
      .eq("advisor_id", userId)
      .eq("date", selectedDate);
    if (!error) {
      alert("設定を削除しました。");
      await loadSchedules();
      setSelectedDate(null);
    }
    setSaving(false);
  };

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

  const openPlan = async (booking: Booking) => {
    setSelectedBooking(booking);
    const { data: plans } = await supabase
      .from("business_plans")
      .select("*")
      .eq("user_id", booking.user_id)
      .limit(1)
      .maybeSingle();

    setSessionReport({
      advisor_comment: booking.advisor_comment || "",
      internal_report: booking.internal_report || "",
      evaluation_result: (booking.evaluation_result as any) || "pending",
    });

    if (plans) {
      setPlanData(plans.plan_data as Record<string, unknown>);
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

  const saveSessionReport = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update(sessionReport)
      .eq("id", selectedBooking.id);

    if (error) alert(error.message);
    else {
      alert("評価とレポートを保存しました。");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBooking.id ? { ...b, ...sessionReport } : b,
        ),
      );
    }
    setSaving(false);
  };

  const postComment = async () => {
    if (!newComment.trim() || !selectedBooking || !planData) return;
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
            {selectedBooking.profiles?.display_name || "受講者"} 様 —{" "}
            {selectedBooking.booking_date}
          </h2>
          <div className="header-status">
            <span className={`result-badge ${sessionReport.evaluation_result}`}>
              {sessionReport.evaluation_result === "pass"
                ? "合格"
                : sessionReport.evaluation_result === "fail"
                  ? "不合格"
                  : "未評価"}
            </span>
          </div>
        </div>

        <div className="plan-layout">
          <div className="plan-content">
            <div className="glass-card p-6 mb-6">
              <div className="plan-paper-header">📖 事業計画書サマリー</div>
              {!planData ? (
                <p className="empty-hint">提出されていません。</p>
              ) : (
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
                            className="trad-bg-yellow"
                            style={{ width: "180px" }}
                          >
                            作成日
                          </th>
                          <td style={{ textAlign: "right" }}>
                            {(planData.create_date as string)?.replace(
                              /-/g,
                              " / ",
                            ) || "　　　年　月　日"}{" "}
                            作成
                          </td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">
                            ふりがな
                            <br />
                            <span style={{ fontSize: "1.2rem" }}>お名前</span>
                          </th>
                          <td style={{ height: "60px" }}>
                            <div style={{ fontSize: "0.7rem", color: "#666" }}>
                              {(planData.name_kana as string) || "　"}
                            </div>
                            <div
                              style={{ fontSize: "1.2rem", fontWeight: 800 }}
                            >
                              {(planData.name_full as string) || "　"}
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
                    {(planData.motivation as string) || "　"}
                  </div>

                  {/* 2. Resume */}
                  <div className="section-head trad-bg-yellow">
                    2. 経営者の略歴（勤務先、担当業務、役職、技能・資格等）
                  </div>
                  <div className="table-wrapper">
                    <table className="trad-table" style={{ marginTop: "-2px" }}>
                      <thead>
                        <tr>
                          <th style={{ width: "120px", textAlign: "center" }}>
                            年　月
                          </th>
                          <th style={{ textAlign: "center" }}>内容</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          (planData.cv_rows as any[]) || [
                            { date: "", content: "" },
                          ]
                        ).map((row, i) => (
                          <tr key={i}>
                            <td style={{ textAlign: "center", height: "28px" }}>
                              {row.date}
                            </td>
                            <td>{row.content}</td>
                          </tr>
                        ))}
                        {Array.from({
                          length: Math.max(
                            0,
                            4 - ((planData.cv_rows as any[])?.length || 0),
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
                    3. 事業内容（簡潔に
                    誰に・どんな・どうやって商品やサービスを届けるか？）
                  </div>
                  <div className="section-body" style={{ minHeight: "60px" }}>
                    {(planData.service_main as string) || "　"}
                  </div>

                  <div className="section-head trad-bg-yellow">
                    ①取り扱い商品・サービス等
                  </div>
                  <div className="section-body" style={{ minHeight: "60px" }}>
                    {(planData.service_items as string) || "　"}
                  </div>

                  <div className="table-wrapper">
                    <table className="trad-table" style={{ borderTop: "none" }}>
                      <tbody>
                        <tr>
                          <th
                            className="trad-bg-yellow"
                            style={{ width: "300px" }}
                          >
                            ②客単価（現時点で想定される金額）
                          </th>
                          <td>{planData.service_unit_price as string} 円</td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">
                            ③営業日数（365-休日）
                          </th>
                          <td>{planData.service_days as string} 日</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="section-head trad-bg-yellow">
                    ④セールスポイント
                  </div>
                  <div className="section-body" style={{ minHeight: "40px" }}>
                    {(planData.service_strength as string) || "　"}
                  </div>

                  <div className="section-head trad-bg-yellow">
                    ⑤販売ターゲット・販売戦略について（集客について）
                  </div>
                  <div className="section-body" style={{ minHeight: "40px" }}>
                    {(planData.service_strategy as string) || "　"}
                  </div>

                  <div className="section-head trad-bg-yellow">
                    ⑥競合・市場調査の結果
                  </div>
                  <div className="section-body" style={{ minHeight: "40px" }}>
                    {(planData.service_research as string) || "　"}
                  </div>

                  {/* 4. Org */}
                  <div className="section-head trad-bg-yellow">4. 組織体制</div>
                  <div className="table-wrapper">
                    <table className="trad-table" style={{ marginTop: "-2px" }}>
                      <tbody>
                        <tr>
                          <th
                            className="trad-bg-yellow"
                            style={{ width: "250px" }}
                          >
                            ①従業員
                          </th>
                          <td style={{ textAlign: "right" }}>
                            {(planData.org_employees as number) || 0} 名
                          </td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">
                            ②パート・アルバイト
                          </th>
                          <td style={{ textAlign: "right" }}>
                            {(planData.org_part_time as number) || 0} 名
                          </td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">③その他</th>
                          <td style={{ textAlign: "right" }}>
                            {(planData.org_others as number) || 0} 名
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
                    <table className="trad-table" style={{ marginTop: "-2px" }}>
                      <tbody>
                        <tr>
                          <th
                            className="trad-bg-yellow"
                            style={{ width: "180px" }}
                          >
                            ①販売先
                          </th>
                          <td style={{ height: "60px" }}>
                            {(planData.partners_sales as string) || "　"}
                          </td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">②仕入先</th>
                          <td style={{ height: "60px" }}>
                            {(planData.partners_supplier as string) || "　"}
                          </td>
                        </tr>
                        <tr>
                          <th className="trad-bg-yellow">③外注先</th>
                          <td style={{ height: "60px" }}>
                            {(planData.partners_outsourcing as string) || "　"}
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
                            style={{ textAlign: "center", height: "28px" }}
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
                                {((planData.funds_equip_items as any[]) || [])
                                  .filter((f) => f.item)
                                  .map((f, i) => (
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
                                    4 -
                                      ((
                                        planData.funds_equip_items as any[]
                                      )?.filter((f) => f.item).length || 0),
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
                          <td style={{ textAlign: "right", width: "80px" }}>
                            {planData.finance_self as string}
                          </td>
                          <td style={{ width: "30px", fontSize: "0.7rem" }}>
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
                                {((planData.funds_work_items as any[]) || [])
                                  .filter((f) => f.item)
                                  .map((f, i) => (
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
                                    4 -
                                      ((
                                        planData.funds_work_items as any[]
                                      )?.filter((f) => f.item).length || 0),
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
                          <th className="trad-bg-yellow">金融機関からの借入</th>
                          <td style={{ textAlign: "right" }}>
                            {planData.finance_loan as string}
                          </td>
                          <td style={{ fontSize: "0.7rem" }}>万円</td>
                        </tr>
                        <tr className="trad-bg-yellow">
                          <td colSpan={2} style={{ textAlign: "right" }}>
                            合計{" "}
                            <strong>
                              {(
                                (planData.funds_equip_items as any[]) || []
                              ).reduce(
                                (acc, cur) => acc + Number(cur.amount || 0),
                                0,
                              ) +
                                (
                                  (planData.funds_work_items as any[]) || []
                                ).reduce(
                                  (acc, cur) => acc + Number(cur.amount || 0),
                                  0,
                                )}
                            </strong>{" "}
                            万円
                          </td>
                          <td colSpan={3} style={{ textAlign: "right" }}>
                            合計{" "}
                            <strong>
                              {Number(planData.finance_self || 0) +
                                Number(planData.finance_loan || 0)}
                            </strong>{" "}
                            万円
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 7. Projections */}
                  <div className="section-head trad-bg-yellow">
                    7. 事業の見通し（月平均）
                  </div>
                  <div className="table-wrapper">
                    <table
                      className="trad-table"
                      style={{ marginTop: "-2px", fontSize: "0.80rem" }}
                    >
                      <thead>
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
                      </thead>
                      <tbody>
                        <tr>
                          <td className="trad-bg-yellow">　売上高(a)</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_sales as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_sales as string}
                          </td>
                          <td>{planData.startup_basis as string}</td>
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
                          <td className="trad-bg-yellow">　売上原価(b)</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_cost as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_cost as string}
                          </td>
                          <td>{planData.cost_basis as string}</td>
                          <td></td>
                        </tr>

                        <tr
                          className="trad-bg-yellow"
                          style={{ textAlign: "center" }}
                        >
                          <th style={{ width: "150px" }}>②経費について</th>
                          <th style={{ width: "80px" }}>創業当初</th>
                          <th style={{ width: "80px" }}>1年後</th>
                          <th style={{ width: "200px" }}>数字の根拠</th>
                          <th></th>
                        </tr>
                        <tr>
                          <td className="trad-bg-yellow">　人件費</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_labor as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_labor as string}
                          </td>
                          <td>{planData.labor_basis as string}</td>
                          <td style={{ fontSize: "0.6rem" }}>
                            例)20万円×2名×12か月
                          </td>
                        </tr>
                        <tr>
                          <td className="trad-bg-yellow">　家賃</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_rent as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_rent as string}
                          </td>
                          <td>{planData.rent_basis as string}</td>
                          <td style={{ fontSize: "0.6rem" }}>
                            例)7万円×12か月分
                          </td>
                        </tr>
                        <tr>
                          <td className="trad-bg-yellow">　支払利息</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_interest as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_interest as string}
                          </td>
                          <td>{planData.interest_basis as string}</td>
                          <td style={{ fontSize: "0.6rem" }}>例)500万円×2%</td>
                        </tr>
                        <tr>
                          <td className="trad-bg-yellow">　その他</td>
                          <td style={{ textAlign: "right" }}>
                            {planData.startup_others as string}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {planData.after1y_others as string}
                          </td>
                          <td>{planData.proj_others_basis as string}</td>
                          <td></td>
                        </tr>
                        <tr className="trad-bg-yellow">
                          <th style={{ textAlign: "center" }}>
                            　経費合計 (c)
                          </th>
                          <td style={{ textAlign: "right" }}>
                            {Number(planData.startup_labor || 0) +
                              Number(planData.startup_rent || 0) +
                              Number(planData.startup_interest || 0) +
                              Number(planData.startup_others || 0)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {Number(planData.after1y_labor || 0) +
                              Number(planData.after1y_rent || 0) +
                              Number(planData.after1y_interest || 0) +
                              Number(planData.after1y_others || 0)}
                          </td>
                          <td></td>
                          <td></td>
                        </tr>
                        <tr className="trad-bg-yellow">
                          <th style={{ textAlign: "center" }}>③利益 (a-b-c)</th>
                          <td style={{ textAlign: "right" }}>
                            <strong>
                              {Number(planData.startup_sales || 0) -
                                Number(planData.startup_cost || 0) -
                                (Number(planData.startup_labor || 0) +
                                  Number(planData.startup_rent || 0) +
                                  Number(planData.startup_interest || 0) +
                                  Number(planData.startup_others || 0))}
                            </strong>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <strong>
                              {Number(planData.after1y_sales || 0) -
                                Number(planData.after1y_cost || 0) -
                                (Number(planData.after1y_labor || 0) +
                                  Number(planData.after1y_rent || 0) +
                                  Number(planData.after1y_interest || 0) +
                                  Number(planData.after1y_others || 0))}
                            </strong>
                          </td>
                          <td colSpan={2} style={{ background: "#eee" }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* 8. Others */}
                  <div className="section-head bg-yellow">
                    8.
                    その他（特に相談時に聞きたい内容があれば記入をお願いいたします）
                  </div>
                  <div className="section-body" style={{ minHeight: "60px" }}>
                    {(planData.other_requests as string) || "　"}
                  </div>
                </div>
              )}
            </div>

            <div className="report-section glass-card">
              <h3>セッション評価とレポート</h3>
              <p className="section-hint">
                ※
                レポートは他の担当者と運営のみが閲覧可能です。コメントは受講者に公開されます。
              </p>

              <div className="form-group mb-4">
                <label>合否判定</label>
                <div className="radio-group">
                  {["pass", "fail", "pending"].map((res) => (
                    <label
                      key={res}
                      className={`radio-label ${sessionReport.evaluation_result === res ? "active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="result"
                        value={res}
                        checked={sessionReport.evaluation_result === res}
                        onChange={() =>
                          setSessionReport({
                            ...sessionReport,
                            evaluation_result: res as any,
                          })
                        }
                      />{" "}
                      {res === "pass"
                        ? "合格"
                        : res === "fail"
                          ? "不合格"
                          : "未評価"}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group mb-4">
                <label>受講生へのコメント (公開される評価要約)</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={sessionReport.advisor_comment}
                  onChange={(e) =>
                    setSessionReport({
                      ...sessionReport,
                      advisor_comment: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group mb-4">
                <label>運営・担当者用レポート (非公開)</label>
                <textarea
                  className="input-field"
                  rows={4}
                  value={sessionReport.internal_report}
                  onChange={(e) =>
                    setSessionReport({
                      ...sessionReport,
                      internal_report: e.target.value,
                    })
                  }
                />
              </div>

              <button
                className="primary-btn w-full"
                onClick={saveSessionReport}
                disabled={saving}
              >
                <Save size={18} /> 評価とレポートを保存
              </button>
            </div>
          </div>

          <div className="comment-panel glass-card">
            <h3>アドバイス・チャット履歴</h3>
            <div className="comment-list">
              {comments.map((c) => (
                <div key={c.id} className="comment-bubble">
                  <div className="comment-meta">
                    <span className="comment-author">{c.advisor_name}</span>
                    <span className="comment-time">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="comment-text">{c.comment_text}</p>
                </div>
              ))}
            </div>
            <div className="comment-input-area">
              <textarea
                className="input-field"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button className="primary-btn" onClick={postComment}>
                コメントを送信
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          .plan-viewer {
            padding: 16px;
            background: #f8fafc;
            min-height: 100vh;
          }
          .plan-header {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
            align-items: flex-start;
          }
          .plan-header h2 {
            font-size: 1.25rem;
            margin: 0;
            line-height: 1.4;
          }
          .back-btn {
            background: none;
            border: none;
            color: var(--primary);
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            font-size: 0.9rem;
          }
          .header-status {
            margin-left: 0;
          }
          .plan-layout {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .plan-content {
            width: 100%;
          }
          .plan-sections {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-top: 16px;
          }
          .plan-field {
            padding: 12px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }
          .report-section {
            padding: 24px;
            background: white;
            border-radius: 12px;
          }
          .radio-group {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .radio-label {
            flex: 1;
            min-width: 80px;
            padding: 10px;
            font-size: 0.9rem;
          }
          .comment-panel {
            padding: 20px;
            width: 100%;
          }
          .plan-paper {
            background: white !important;
            color: black !important;
            padding: 16px;
            border-radius: 8px;
          }
          .plan-paper-header {
            font-size: 1.1rem;
            font-weight: 800;
            margin-bottom: 16px;
            color: var(--secondary);
            display: flex;
            align-items: center;
            gap: 8px;
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
          .section-body:last-of-type {
            border-bottom: 2px solid black;
            margin-bottom: 32px;
          }

          @media (min-width: 1024px) {
            .plan-viewer {
              padding: 40px;
            }
            .plan-header {
              flex-direction: row;
              align-items: center;
              gap: 20px;
              margin-bottom: 32px;
            }
            .plan-header h2 {
              font-size: 1.5rem;
            }
            .header-status {
              margin-left: auto;
            }
            .plan-layout {
              display: grid;
              grid-template-columns: 1fr 400px;
              gap: 32px;
            }
            .comment-panel {
              padding: 24px;
            }
            .plan-paper {
              padding: 24px;
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
            onClick={() => router.push("/advisor")}
          >
            <BookOpen size={18} /> 予約一覧
          </button>
          <button
            className={`advisor-nav-item ${tab === "schedule" ? "active" : ""}`}
            onClick={() => router.push("/advisor/schedule")}
          >
            <Calendar size={18} /> シフト設定
          </button>
          <button
            className={`advisor-nav-item ${tab === "profile" ? "active" : ""}`}
            onClick={() => router.push("/advisor/profile")}
          >
            <User size={18} /> プロフィール
          </button>
        </div>
        <button className="logout-btn" onClick={onSignOut}>
          <LogOut size={16} /> ログアウト
        </button>
      </nav>

      <main className="advisor-main">
        {tab === "bookings" && (
          <div>
            <h1 className="advisor-title">受講生・予約一覧</h1>
            <p className="advisor-subtitle">
              設定したシフトに基づく予約状況です。クリックして評価やレポートを行えます。
            </p>
            <div className="shifts-container">
              {operatingHours
                .filter((oh) => dailySchedules.some((s) => s.date === oh.date))
                .map((oh) => {
                  const dayBookings = bookings.filter(
                    (b) => b.booking_date === oh.date,
                  );
                  const [y, m, d] = oh.date.split("-").map(Number);
                  const dObj = new Date(y, m - 1, d);
                  const dayOfWeek = dObj.getDay();
                  const shiftTime = dailySchedules.find(
                    (s) => s.date === oh.date,
                  );

                  if (!shiftTime) return null;

                  return (
                    <div key={oh.date} className="shift-day-card glass-card">
                      <div className="shift-day-header">
                        <span className="shift-day-date">
                          {oh.date} ({DAYS[dayOfWeek]})
                        </span>
                        <span className="shift-day-time">
                          シフト: {shiftTime.start_time.substring(0, 5)} 〜{" "}
                          {shiftTime.end_time.substring(0, 5)}
                        </span>
                      </div>

                      <div className="day-bookings-list">
                        {dayBookings.length === 0 ? (
                          <p className="empty-slot-hint">予約はありません</p>
                        ) : (
                          dayBookings.map((b) => (
                            <button
                              key={b.id}
                              className={`booking-item-mini ${b.evaluation_result === "pass" ? "pass" : ""}`}
                              onClick={() => openPlan(b)}
                            >
                              <div className="b-time">{b.start_time}</div>
                              <div className="b-name">
                                👤 {b.profiles?.display_name || "受講者"}
                              </div>
                              <div className="b-status">
                                {b.evaluation_result !== "pending" && (
                                  <span
                                    className={`mini-eval-badge ${b.evaluation_result}`}
                                  >
                                    {b.evaluation_result === "pass"
                                      ? "合格"
                                      : "不合格"}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              {operatingHours.filter((oh) =>
                dailySchedules.some((s) => s.date === oh.date),
              ).length === 0 && (
                <div className="empty-state glass-card p-12 text-center">
                  <p>有効なシフト設定日がありません。</p>
                  <p className="text-sm text-gray-500 mt-2">
                    「シフト設定」タブから稼働する曜日を設定してください。
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <div className="hours-view">
            <h1 className="advisor-title">シフト設定（カレンダー方式）</h1>
            <p className="advisor-subtitle">
              運営によって予約可能に設定された日付から、ご自身の稼働時間を設定してください。
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
                    {DAYS.map((d) => (
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

                      const dateStr = [
                        dateObj.getFullYear(),
                        (dateObj.getMonth() + 1).toString().padStart(2, "0"),
                        dateObj.getDate().toString().padStart(2, "0"),
                      ].join("-");

                      const isSelected = selectedDate === dateStr;

                      const isOpenByAdmin = operatingHours.find(
                        (h) => h.date === dateStr,
                      );
                      const myShift = dailySchedules.find(
                        (s) => s.date === dateStr,
                      );

                      if (!isCurrentMonth)
                        return <div key={i} className="day-cell muted" />;

                      if (!isOpenByAdmin) {
                        return (
                          <div
                            key={i}
                            className="day-cell muted admin-closed"
                            title="運営休業日"
                          >
                            <span className="day-num">{dNumber}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={i}
                          className={`day-cell ${isSelected ? "selected" : ""} ${myShift ? "has-config" : ""}`}
                          onClick={() => {
                            setSelectedDate(dateStr);
                            if (myShift) {
                              setNewHour({
                                start_time: myShift.start_time.substring(0, 5),
                                end_time: myShift.end_time.substring(0, 5),
                              });
                            } else {
                              // Default to admin's operation hours
                              setNewHour({
                                start_time: isOpenByAdmin.start_time.substring(
                                  0,
                                  5,
                                ),
                                end_time: isOpenByAdmin.end_time.substring(
                                  0,
                                  5,
                                ),
                              });
                            }
                          }}
                        >
                          <span className="day-num">{dNumber}</span>
                          {myShift && (
                            <div className="config-hint">
                              {myShift.start_time.substring(0, 5)}〜
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
                    <h3>{selectedDate} のシフト設定</h3>
                    <p className="setting-hint">
                      バーをドラッグしてあなたの稼働時間を設定してください
                      <br />
                      <span
                        style={{ fontSize: "0.8rem", color: "var(--accent)" }}
                      >
                        ※運営営業日：
                        {operatingHours
                          .find((h) => h.date === selectedDate)
                          ?.start_time.substring(0, 5)}{" "}
                        〜{" "}
                        {operatingHours
                          .find((h) => h.date === selectedDate)
                          ?.end_time.substring(0, 5)}
                      </span>
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
                        {Array.from({ length: 25 }).map((_, i) => (
                          <div
                            key={i}
                            className="time-tick"
                            style={{ left: `${(i / 24) * 100}%` }}
                          />
                        ))}
                        {adminSlot && (
                          <div
                            className="range-highlight admin-range"
                            style={{
                              left: `${(parseInt(adminSlot.start_time) / 24) * 100}%`,
                              width: `${((parseInt(adminSlot.end_time) - parseInt(adminSlot.start_time)) / 24) * 100}%`,
                            }}
                          />
                        )}
                        <div
                          className="range-highlight advisor-range"
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

                    <div
                      className="actions"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="primary-btn w-full"
                        onClick={saveDailySchedule}
                        disabled={saving}
                      >
                        <Save size={16} /> 設定を保存する
                      </button>
                      {dailySchedules.find((s) => s.date === selectedDate) && (
                        <button
                          className="text-btn danger w-full mt-4"
                          onClick={() => removeDailySchedule()}
                        >
                          この日のシフトを削除
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-selection">
                    <Calendar size={48} />
                    <p>カレンダーから稼働する日付を選択してください</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div className="glass-card p-8">
            <h1 className="advisor-title">プロフィール</h1>
            <div className="form-group mb-4">
              <label>表示名</label>
              <input
                className="input-field"
                value={profile.display_name}
                onChange={(e) =>
                  setProfile({ ...profile, display_name: e.target.value })
                }
              />
            </div>
            <div className="form-group mb-4">
              <label>自己紹介</label>
              <textarea
                className="input-field"
                rows={4}
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
              保存する
            </button>
          </div>
        )}
      </main>

      <style jsx>{`
        .advisor-root {
          display: flex;
          flex-direction: column; /* Mobile first */
          min-height: 100vh;
          background: #f1f5f9;
        }

        .advisor-sidebar {
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

        .advisor-brand {
          display: none; /* Hide on mobile nav */
        }

        .advisor-nav {
          display: flex;
          flex-direction: row;
          gap: 12px;
          flex: 1;
          justify-content: space-around;
        }

        .advisor-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.7rem;
          color: var(--text-dim);
          cursor: pointer;
          transition: all 0.2s;
        }
        .advisor-nav-item.active {
          background: var(--primary-soft);
          color: var(--primary);
        }

        .advisor-main {
          order: 1;
          flex: 1;
          padding: 24px 16px 100px 16px;
          width: 100%;
          margin: 0 auto;
        }

        .advisor-title {
          font-size: 1.5rem;
          font-weight: 900;
          margin-bottom: 8px;
        }
        .advisor-subtitle {
          color: #64748b;
          margin-bottom: 24px;
          font-size: 0.9rem;
        }

        /* Desktop Adjustments */
        @media (min-width: 900px) {
          .advisor-root {
            flex-direction: row;
          }
          .advisor-sidebar {
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
            gap: 40px;
          }
          .advisor-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 900;
            font-size: 1.1rem;
            color: var(--secondary);
            margin-bottom: 32px;
          }
          .advisor-nav {
            flex-direction: column;
            justify-content: flex-start;
            gap: 4px;
          }
          .advisor-nav-item {
            flex-direction: row;
            font-size: 0.9rem;
            padding: 12px 16px;
            gap: 12px;
          }
          .advisor-main {
            padding: 48px;
            max-width: 1000px;
          }
          .advisor-title {
            font-size: 2rem;
          }
        }
        .shifts-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .shift-day-card {
          padding: 24px;
        }
        .shift-day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #f1f5f9;
          padding-bottom: 12px;
        }
        .shift-day-date {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--secondary);
        }
        .shift-day-time {
          padding: 4px 12px;
          background: var(--primary-soft);
          color: var(--primary);
          border-radius: 99px;
          font-size: 0.85rem;
          font-weight: 800;
        }
        .day-bookings-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .empty-slot-hint {
          color: #94a3b8;
          font-size: 0.9rem;
          font-style: italic;
        }
        .booking-item-mini {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .booking-item-mini:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        .booking-item-mini.pass {
          border-left: 4px solid #10b981;
        }
        .b-time {
          font-weight: 800;
          color: var(--primary);
          font-size: 0.9rem;
          min-width: 50px;
        }
        .b-name {
          font-weight: 700;
          flex: 1;
        }
        .mini-eval-badge {
          font-size: 0.7rem;
          font-weight: 900;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .mini-eval-badge.pass {
          background: #dcfce7;
          color: #166534;
        }
        .mini-eval-badge.fail {
          background: #fee2e2;
          color: #991b1b;
        }
        .empty-state {
          padding: 60px;
          color: #64748b;
        }
        .shift-list {
          display: flex;
          flex-direction: column;
          margin-top: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          overflow: hidden;
        }
        .flex-row {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 24px;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }
        .flex-row:last-child {
          border-bottom: none;
        }
        .flex-row:hover {
          background: #fafafa;
        }
        .toggle-label {
          min-width: 120px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          font-size: 1rem;
          color: #334155;
        }
        .toggle-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary);
        }
        .time-select {
          display: flex;
          gap: 16px;
          align-items: center;
          animation: fadeIn 0.3s ease;
        }
        .time-input-wrap {
          display: inline-flex;
        }
        .time-select input[type="time"] {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-family: var(--font-accent);
          font-size: 0.95rem;
          color: #334155;
          width: 130px;
          outline: none;
          transition: border-color 0.2s;
          background: white;
        }
        .time-select input[type="time"]:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-soft);
        }
        .time-separator {
          color: #94a3b8;
          font-weight: bold;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* ===== Calendar Layout ===== */
        .hours-view {
          width: 100%;
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
          color: var(--secondary);
        }
        .calendar-body {
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
          font-size: 0.9rem;
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
        .day-cell.muted {
          opacity: 0.15;
          cursor: default;
          pointer-events: none;
        }
        .day-cell.admin-closed {
          opacity: 0.3;
          cursor: not-allowed;
          pointer-events: none;
        }
        .day-num {
          font-weight: 700;
          font-size: 0.95rem;
        }
        .config-hint {
          font-size: 0.55rem;
          font-weight: 800;
          margin-top: 2px;
          line-height: 1;
        }

        /* ===== Settings Panel ===== */
        .settings-panel {
          padding: 24px;
          background: white;
          min-height: 400px;
          border-radius: 16px;
        }
        .empty-selection {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #cbd5e1;
          text-align: center;
          gap: 16px;
        }
        .setting-content h3 {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--secondary);
          margin-bottom: 8px;
        }
        .setting-hint {
          font-size: 0.8rem;
          color: #64748b;
          margin-bottom: 24px;
          line-height: 1.7;
        }
        .animate-in {
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ===== Time Range Drag Bar ===== */
        .time-range-picker {
          margin-bottom: 32px;
        }
        .time-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: #94a3b8;
          margin-bottom: 6px;
        }
        .time-bar-container {
          height: 48px;
          background: #f1f5f9;
          border-radius: 8px;
          position: relative;
          cursor: crosshair;
          user-select: none;
          overflow: hidden;
        }
        .time-tick {
          position: absolute;
          top: 0;
          width: 1px;
          height: 100%;
          background: #e2e8f0;
        }
        .range-highlight {
          position: absolute;
          border-radius: 4px;
          transition:
            left 0.05s,
            width 0.05s;
        }
        .admin-range {
          top: 0;
          height: 50%;
          background: #3b82f6;
          opacity: 0.6;
        }
        .advisor-range {
          top: 50%;
          height: 50%;
          background: #ef4444;
          opacity: 0.8;
        }
        .time-value-display {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          justify-content: center;
        }
        .t-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--bg-soft);
          border-radius: 8px;
          padding: 10px 20px;
          min-width: 80px;
        }
        .t-box span {
          font-size: 0.7rem;
          color: #94a3b8;
          font-weight: 700;
        }
        .t-box strong {
          font-size: 1.2rem;
          font-weight: 900;
          color: var(--secondary);
        }
        .t-separator {
          font-size: 1.3rem;
          color: #cbd5e1;
          font-weight: 300;
        }
        .actions {
          margin-top: 16px;
        }
        .glass-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
        }
        .primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          justify-content: center;
        }
        .primary-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .text-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          padding: 10px;
          border-radius: 8px;
          transition: background 0.2s;
          font-weight: 600;
          width: 100%;
        }
        .text-btn.danger {
          color: #ef4444;
        }
        .text-btn.danger:hover {
          background: #fef2f2;
        }
        .w-full {
          width: 100%;
        }
        .mt-4 {
          margin-top: 16px;
        }
        .p-8 {
          padding: 32px;
        }
        .mb-4 {
          margin-bottom: 16px;
        }
        .input-field {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
          background: white;
          box-sizing: border-box;
        }
        .input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px var(--primary-soft);
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}
