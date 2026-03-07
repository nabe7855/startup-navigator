export default function UserPlanViewerModal({
  isOpen,
  onClose,
  planData,
  userBookings,
  recentComments,
}: {
  isOpen: boolean;
  onClose: () => void;
  planData: any;
  userBookings: any[];
  recentComments: any[];
}) {
  if (!isOpen) return null;

  return (
    <div className="booking-modal-overlay" onClick={onClose}>
      <div
        className="student-detail-modal booking-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: "0" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
            事業計画書 全体表示
          </h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body scrollable">
          <div
            className="plan-paper-header"
            style={{ margin: "16px 0", fontWeight: "bold" }}
          >
            📖 事業計画書
          </div>
          {planData ? (
            <div className="plan-paper">
              <div className="paper-title">
                【事業計画書】 特定創業支援事業 起業創業相談窓口事業（宇都宮市）
              </div>
              {/* 1. Basic Info */}
              <div className="table-wrapper">
                <table className="trad-table">
                  <tbody>
                    <tr>
                      <th className="bg-yellow" style={{ width: "180px" }}>
                        作成日
                      </th>
                      <td style={{ textAlign: "right" }}>
                        {planData?.create_date?.replace(/-/g, " / ") ||
                          "　　　年　月　日"}{" "}
                        作成
                      </td>
                    </tr>
                    <tr>
                      <th className="bg-yellow">
                        ふりがな
                        <br />
                        <span style={{ fontSize: "1.2rem" }}>お名前</span>
                      </th>
                      <td style={{ height: "60px" }}>
                        <div style={{ fontSize: "0.7rem", color: "#666" }}>
                          {planData?.name_kana || "　"}
                        </div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                          {planData?.name_full || "　"}
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
              <div className="section-body">{planData?.motivation || "　"}</div>

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
                      (planData?.cv_rows as any[]) || [
                        { date: "", content: "" },
                      ]
                    ).map((row: any, i: number) => (
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
                        4 - ((planData?.cv_rows as any[])?.length || 0),
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
              <div className="section-body" style={{ minHeight: "60px" }}>
                {planData?.service_main || "　"}
              </div>

              <div className="section-head trad-bg-yellow">
                ①取り扱い商品・サービス等
              </div>
              <div className="section-body" style={{ minHeight: "60px" }}>
                {planData?.service_items || "　"}
              </div>

              <div className="table-wrapper">
                <table className="trad-table" style={{ borderTop: "none" }}>
                  <tbody>
                    <tr>
                      <th className="trad-bg-yellow" style={{ width: "300px" }}>
                        ②客単価（現時点で想定される金額）
                      </th>
                      <td>{planData?.service_unit_price} 円</td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">③営業日数（365-休日）</th>
                      <td>{planData?.service_days} 日</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="section-head trad-bg-yellow">
                ④セールスポイント
              </div>
              <div className="section-body" style={{ minHeight: "40px" }}>
                {planData?.service_strength || "　"}
              </div>

              <div className="section-head trad-bg-yellow">
                ⑤販売ターゲット・販売戦略について（集客について）
              </div>
              <div className="section-body" style={{ minHeight: "40px" }}>
                {planData?.service_strategy || "　"}
              </div>

              <div className="section-head trad-bg-yellow">
                ⑥競合・市場調査の結果
              </div>
              <div className="section-body" style={{ minHeight: "40px" }}>
                {planData?.service_research || "　"}
              </div>

              {/* 4. Org */}
              <div className="section-head trad-bg-yellow">4. 組織体制</div>
              <div className="table-wrapper">
                <table className="trad-table" style={{ marginTop: "-2px" }}>
                  <tbody>
                    <tr>
                      <th className="trad-bg-yellow" style={{ width: "250px" }}>
                        ①従業員
                      </th>
                      <td style={{ textAlign: "right" }}>
                        {planData?.org_employees || 0} 名
                      </td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">②パート・アルバイト</th>
                      <td style={{ textAlign: "right" }}>
                        {planData?.org_part_time || 0} 名
                      </td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">③その他</th>
                      <td style={{ textAlign: "right" }}>
                        {planData?.org_others || 0} 名
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
                      <th className="trad-bg-yellow" style={{ width: "180px" }}>
                        ①販売先
                      </th>
                      <td style={{ height: "60px" }}>
                        {planData?.partners_sales || "　"}
                      </td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">②仕入先</th>
                      <td style={{ height: "60px" }}>
                        {planData?.partners_supplier || "　"}
                      </td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">③外注先</th>
                      <td style={{ height: "60px" }}>
                        {planData?.partners_outsourcing || "　"}
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
                      <th className="trad-bg-yellow" style={{ width: "100px" }}>
                        設備資金
                      </th>
                      <td style={{ padding: 0 }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <tbody>
                            {(planData?.funds_equip_items || [])
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
                                  (planData?.funds_equip_items?.filter(
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
                      <th className="trad-bg-yellow" style={{ width: "120px" }}>
                        自己資金
                      </th>
                      <td style={{ textAlign: "right", width: "80px" }}>
                        {planData?.finance_self}
                      </td>
                      <td style={{ width: "30px", fontSize: "0.7rem" }}>
                        万円
                      </td>
                    </tr>
                    <tr>
                      <th className="trad-bg-yellow">運転資金</th>
                      <td style={{ padding: 0 }}>
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <tbody>
                            {(planData?.funds_work_items || [])
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
                                  (planData?.funds_work_items?.filter(
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
                      <th className="trad-bg-yellow">金融機関からの借入</th>
                      <td style={{ textAlign: "right" }}>
                        {planData?.finance_loan}
                      </td>
                      <td style={{ fontSize: "0.7rem" }}>万円</td>
                    </tr>
                    <tr className="trad-bg-yellow">
                      <td colSpan={2} style={{ textAlign: "right" }}>
                        合計{" "}
                        <strong>
                          {(planData?.funds_equip_items || []).reduce(
                            (acc: number, cur: any) =>
                              acc + Number(cur.amount || 0),
                            0,
                          ) +
                            (planData?.funds_work_items || []).reduce(
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
                          {Number(planData?.finance_self || 0) +
                            Number(planData?.finance_loan || 0)}
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
                      <th style={{ width: "150px" }}>①売上について (年間)</th>
                      <th style={{ width: "80px" }}>創業当初</th>
                      <th style={{ width: "80px" }}>1年後</th>
                      <th style={{ width: "200px" }}>数字の根拠</th>
                      <th style={{ width: "120px" }}>例</th>
                    </tr>
                    <tr>
                      <td className="trad-bg-yellow">　売上高(a)</td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.startup_sales}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_sales}
                      </td>
                      <td>{planData?.startup_basis}</td>
                      <td style={{ fontSize: "0.6rem" }}>単価×数量×12か月分</td>
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
                        {planData?.startup_cost}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_cost}
                      </td>
                      <td>{planData?.cost_basis}</td>
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
                        {planData?.startup_labor}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_labor}
                      </td>
                      <td>{planData?.labor_basis}</td>
                      <td style={{ fontSize: "0.6rem" }}>
                        例)20万円×2名×12か月
                      </td>
                    </tr>
                    <tr>
                      <td className="trad-bg-yellow">　家賃</td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.startup_rent}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_rent}
                      </td>
                      <td>{planData?.rent_basis}</td>
                      <td style={{ fontSize: "0.6rem" }}>例)7万円×12か月分</td>
                    </tr>
                    <tr>
                      <td className="trad-bg-yellow">　支払利息</td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.startup_interest}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_interest}
                      </td>
                      <td>{planData?.interest_basis}</td>
                      <td style={{ fontSize: "0.6rem" }}>例)500万円×2%</td>
                    </tr>
                    <tr>
                      <td className="trad-bg-yellow">　その他</td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.startup_others}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {planData?.after1y_others}
                      </td>
                      <td>{planData?.proj_others_basis}</td>
                      <td></td>
                    </tr>
                    <tr className="trad-bg-yellow">
                      <th style={{ textAlign: "center" }}>　経費合計 (c)</th>
                      <td style={{ textAlign: "right" }}>
                        {Number(planData?.startup_labor || 0) +
                          Number(planData?.startup_rent || 0) +
                          Number(planData?.startup_interest || 0) +
                          Number(planData?.startup_others || 0)}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {Number(planData?.after1y_labor || 0) +
                          Number(planData?.after1y_rent || 0) +
                          Number(planData?.after1y_interest || 0) +
                          Number(planData?.after1y_others || 0)}
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr className="trad-bg-yellow">
                      <th style={{ textAlign: "center" }}>③利益 (a-b-c)</th>
                      <td style={{ textAlign: "right" }}>
                        <strong>
                          {Number(planData?.startup_sales || 0) -
                            Number(planData?.startup_cost || 0) -
                            (Number(planData?.startup_labor || 0) +
                              Number(planData?.startup_rent || 0) +
                              Number(planData?.startup_interest || 0) +
                              Number(planData?.startup_others || 0))}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>
                          {Number(planData?.after1y_sales || 0) -
                            Number(planData?.after1y_cost || 0) -
                            (Number(planData?.after1y_labor || 0) +
                              Number(planData?.after1y_rent || 0) +
                              Number(planData?.after1y_interest || 0) +
                              Number(planData?.after1y_others || 0))}
                        </strong>
                      </td>
                      <td colSpan={2} style={{ background: "#eee" }}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 8. Others */}
              <div className="section-head trad-bg-yellow">
                8.
                その他（特に相談時に聞きたい内容があれば記入をお願いいたします）
              </div>
              <div className="section-body" style={{ minHeight: "60px" }}>
                {planData?.other_requests || "　"}
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
              {!userBookings || userBookings.length === 0 ? (
                <p className="empty-hint">予約履歴がありません。</p>
              ) : (
                userBookings.map((b) => (
                  <div key={b.id} className="history-item">
                    <div className="history-head">
                      <span className="h-date">
                        {b.booking_date} {b.start_time}
                      </span>
                      {b.evaluation_result &&
                        b.evaluation_result !== "pending" && (
                          <span
                            className={`result-badge ${b.evaluation_result}`}
                          >
                            {b.evaluation_result === "pass" ? "合格" : "不合格"}
                          </span>
                        )}
                    </div>
                    <div className="h-advisor">
                      担当: {(b.profiles as any)?.display_name || "担当者"}
                    </div>
                    {b.advisor_comment && (
                      <div className="h-reports mt-2">
                        <div className="h-comment">
                          <strong>担当者からのコメント:</strong>
                          <p>{b.advisor_comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="detail-section mt-4">
            <h4>💬 計画書へのコメント一覧</h4>
            <div className="comments-history">
              {!recentComments || recentComments.length === 0 ? (
                <p className="empty-hint">まだコメントはありません。</p>
              ) : (
                recentComments.map((c) => (
                  <div key={c.id} className="mini-comment mt-2">
                    <div
                      className="c-head"
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--primary)",
                        fontWeight: "bold",
                      }}
                    >
                      {(c.profiles as any)?.display_name || "担当者"} -{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                    <p style={{ margin: "4px 0", fontSize: "0.9rem" }}>
                      {c.comment_text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
      <style jsx>
        {`
          /* Keep identical .plan-paper style definitions here */
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
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          }
          @media (min-width: 768px) {
            .student-detail-modal {
              padding: 32px;
            }
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
          .modal-body.scrollable {
            overflow-y: auto;
            flex: 1;
            padding-right: 8px;
          }

          .plan-paper {
            background: white !important;
            color: black !important;
            padding: 12px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
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
          .trad-bg-yellow,
          .bg-yellow {
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

          /* Details sections */
          .detail-section h4 {
            font-size: 1rem;
            color: var(--secondary);
            margin-bottom: 16px;
          }
          hr {
            border: 0;
            border-top: 1px solid #e2e8f0;
            margin: 20px 0;
          }

          .history-item {
            background: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
          }
          .history-head {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
          .h-advisor {
            font-size: 0.85rem;
            color: #64748b;
            margin-bottom: 8px;
          }
          .h-reports {
            background: #fff;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid var(--primary);
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

          .mini-comment {
            background: #f8fafc;
            padding: 12px;
            border-radius: 8px;
            border-left: 3px solid var(--primary);
          }
        `}
      </style>
    </div>
  );
}
