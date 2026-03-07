"use client";

import { supabase } from "@/lib/supabase";
import { BookOpen, Calendar, LogOut, Save, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  const [sessionReport, setSessionReport] = useState({
    advisor_comment: "",
    internal_report: "",
    evaluation_result: "pending" as "pass" | "fail" | "pending",
  });
  const [operatingHours, setOperatingHours] = useState<any[]>([]);

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
    const { data } = await supabase
      .from("advisor_schedules")
      .select("*")
      .eq("advisor_id", userId);

    // 初期化（すべて無効化）
    const resetMap: typeof schedules = {};
    for (let i = 0; i <= 6; i++) {
      resetMap[i] = { start: "10:00", end: "17:00", enabled: false };
    }

    if (data && data.length > 0) {
      data.forEach((s) => {
        resetMap[s.day_of_week] = {
          start: s.start_time.substring(0, 5),
          end: s.end_time.substring(0, 5),
          enabled: true,
        };
      });
    }
    setSchedules(resetMap);
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
                .filter((oh) => {
                  const [y, m, d] = oh.date.split("-").map(Number);
                  const dObj = new Date(y, m - 1, d);
                  const dayOfWeek = dObj.getDay();
                  return schedules[dayOfWeek]?.enabled;
                })
                .map((oh) => {
                  const dayBookings = bookings.filter(
                    (b) => b.booking_date === oh.date,
                  );
                  const [y, m, d] = oh.date.split("-").map(Number);
                  const dObj = new Date(y, m - 1, d);
                  const dayOfWeek = dObj.getDay();
                  const shiftTime = schedules[dayOfWeek];

                  return (
                    <div key={oh.date} className="shift-day-card glass-card">
                      <div className="shift-day-header">
                        <span className="shift-day-date">
                          {oh.date} ({DAYS[dayOfWeek]})
                        </span>
                        <span className="shift-day-time">
                          シフト: {shiftTime.start} 〜 {shiftTime.end}
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
              {operatingHours.filter((oh) => {
                const d = new Date(oh.date);
                const dayOfWeek = d.getDay();
                return schedules[dayOfWeek]?.enabled;
              }).length === 0 && (
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
          <div className="glass-card p-8">
            <h1 className="advisor-title">シフト設定</h1>
            {DAYS.map((day, i) => (
              <div key={i} className="flex-row">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={schedules[i]?.enabled}
                    onChange={(e) =>
                      setSchedules({
                        ...schedules,
                        [i]: { ...schedules[i], enabled: e.target.checked },
                      })
                    }
                  />
                  {day}曜日
                </label>
                {schedules[i]?.enabled && (
                  <div className="time-select">
                    <input
                      type="time"
                      value={schedules[i].start}
                      onChange={(e) =>
                        setSchedules({
                          ...schedules,
                          [i]: { ...schedules[i], start: e.target.value },
                        })
                      }
                    />
                    〜
                    <input
                      type="time"
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
              className="primary-btn mt-6"
              onClick={saveSchedules}
              disabled={saving}
            >
              保存する
            </button>
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
        .flex-row {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .toggle-label {
          min-width: 100px;
          font-weight: 700;
          display: flex;
          gap: 8px;
          cursor: pointer;
        }
        .time-select {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .time-select input {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #cbd5e1;
        }
      `}</style>
    </div>
  );
}
