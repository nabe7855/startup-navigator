"use client";

import { ArrowRight, BookOpen, Rocket, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="lp-container">
      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <Rocket size={28} className="text-primary" />
          <span className="font-bold text-xl tracking-tight text-slate-900">
            STARTUP NAVIGATOR
          </span>
        </div>
        <div className="lp-nav-actions">
          <button
            className="text-btn outline"
            onClick={() => router.push("/login")}
          >
            ログイン
          </button>
          <button
            className="primary-btn sm"
            onClick={() => router.push("/login")}
          >
            無料で始める
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">夢を描き、計画で実現する</div>
          <h1 className="hero-title">
            あなたの「起業のアイデア」を
            <br />
            確かな<span className="text-gradient">カタチ</span>に。
          </h1>
          <p className="hero-description">
            STARTUP NAVIGATOR
            は、これから創業を志す方が直面する「何から始めればいいかわからない」を解決する伴走型プラットフォームです。専門のアドバイザーと繋がり、ステップバイステップであなただけの事業計画書を作成しましょう。
          </p>
          <div className="hero-actions">
            <button
              className="main-cta-btn"
              onClick={() => router.push("/login")}
            >
              アカウントを無料作成 <ArrowRight size={20} />
            </button>
          </div>
          <p className="hero-trust">
            ✓ 完全無料 ✓ 専門家のフィードバック ✓ 安心のセキュリティ
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>あなたの創業準備を強力にサポート</h2>
          <p>初めての方でも迷わず使いこなせる3つの機能</p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="f-icon bg-blue-100 text-blue-600">
              <BookOpen size={32} />
            </div>
            <h3>迷わない事業計画作成</h3>
            <p>
              穴埋め形式で進められる「ウィザード機能」を搭載。一つ一つのステップに沿って入力するだけで、本格的な事業計画書が自動で完成します。
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="f-icon bg-green-100 text-green-600">
              <Users size={32} />
            </div>
            <h3>専門アドバイザーと面談</h3>
            <p>
              作成した計画書をもとに、経験豊富なアドバイザーとの面談をオンラインで直接予約できます。親身なサポートであなたの不安を解消します。
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="f-icon bg-purple-100 text-purple-600">
              <Shield size={32} />
            </div>
            <h3>安心・安全の環境</h3>
            <p>
              大切な事業アイデアはセキュアな環境で厳密に守られます。アドバイザー以外の第三者に閲覧されることはありませんので安心して書き込めます。
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="steps-section bg-slate-50">
        <div className="section-header">
          <h2>利用のステップ</h2>
        </div>
        <div className="steps-container">
          <div className="step-item">
            <div className="step-number">1</div>
            <h4>アカウント作成</h4>
            <p>メールアドレスだけで数分で完了します。</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-item">
            <div className="step-number">2</div>
            <h4>計画書の執筆</h4>
            <p>ウィザードを使って構想を言語化します。</p>
          </div>
          <div className="step-connector"></div>
          <div className="step-item">
            <div className="step-number">3</div>
            <h4>面談とブラッシュアップ</h4>
            <p>アドバイザーのフィードバックを受け取ります。</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-box glass-card">
          <h2>すべての人に、挑戦する機会を。</h2>
          <p>
            完璧な計画である必要はありません。まずはあなたの熱い想いを書き出すことから始めましょう。
          </p>
          <button
            className="primary-btn lg"
            onClick={() => router.push("/login")}
          >
            今すぐアカウントを作成する <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="footer-content">
          <div className="lp-brand mb-4">
            <Rocket size={24} className="text-slate-400" />
            <span className="font-bold text-slate-500">STARTUP NAVIGATOR</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2026 Startup Navigator. All rights reserved.
          </p>
        </div>
      </footer>

      <style jsx>{`
        .lp-container {
          min-height: 100vh;
          background-color: var(--bg-main);
          font-family: var(--font-main);
          overflow-x: hidden;
        }

        .text-primary {
          color: var(--primary);
        }
        .text-gradient {
          background: linear-gradient(135deg, var(--primary) 0%, #10b981 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Navigation */
        .lp-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 5%;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          z-index: 1000;
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
        }
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lp-nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .text-btn.outline {
          background: transparent;
          border: 1px solid #cbd5e1;
          color: #475569;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .text-btn.outline:hover {
          background: #f1f5f9;
        }
        .primary-btn.sm {
          padding: 8px 20px;
          font-size: 0.9rem;
        }

        /* Hero Section */
        .hero-section {
          padding: 160px 5% 100px;
          text-align: center;
          background-image:
            radial-gradient(
              circle at 15% 50%,
              rgba(37, 99, 235, 0.08) 0%,
              transparent 40%
            ),
            radial-gradient(
              circle at 85% 30%,
              rgba(16, 185, 129, 0.08) 0%,
              transparent 40%
            );
        }
        .hero-content {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hero-badge {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 6px 16px;
          border-radius: 99px;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 24px;
          letter-spacing: 0.5px;
        }
        .hero-title {
          font-size: 3.5rem;
          font-weight: 900;
          line-height: 1.2;
          color: #0f172a;
          margin-bottom: 24px;
          letter-spacing: -1px;
        }
        .hero-description {
          font-size: 1.15rem;
          color: #475569;
          line-height: 1.8;
          margin-bottom: 40px;
          max-width: 600px;
        }
        .hero-actions {
          margin-bottom: 24px;
        }
        .main-cta-btn {
          background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 18px 40px;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 99px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
          transition: all 0.3s ease;
        }
        .main-cta-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4);
        }
        .hero-trust {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        /* Sections General */
        section {
          padding: 100px 5%;
        }
        .section-header {
          text-align: center;
          margin-bottom: 60px;
        }
        .section-header h2 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 16px;
        }
        .section-header p {
          font-size: 1.1rem;
          color: #64748b;
        }

        /* Features */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          max-width: 1100px;
          margin: 0 auto;
        }
        .feature-card {
          padding: 40px 32px;
          text-align: left;
          background: white;
          border-radius: 20px;
        }
        .f-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .bg-blue-100 {
          background: #dbeafe;
        }
        .text-blue-600 {
          color: #2563eb;
        }
        .bg-green-100 {
          background: #dcfce7;
        }
        .text-green-600 {
          color: #166534;
        }
        .bg-purple-100 {
          background: #f3e8ff;
        }
        .text-purple-600 {
          color: #9333ea;
        }

        .feature-card h3 {
          font-size: 1.25rem;
          font-weight: 800;
          margin-bottom: 16px;
          color: #1e293b;
        }
        .feature-card p {
          color: #475569;
          line-height: 1.7;
        }

        /* Steps */
        .steps-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }
        @media (min-width: 768px) {
          .steps-container {
            flex-direction: row;
            justify-content: space-between;
            align-items: flex-start;
          }
        }
        .step-item {
          text-align: center;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-number {
          width: 56px;
          height: 56px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .step-item h4 {
          font-size: 1.1rem;
          font-weight: 800;
          margin-bottom: 12px;
        }
        .step-item p {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .step-connector {
          display: none;
        }
        @media (min-width: 768px) {
          .step-connector {
            display: block;
            flex: 1;
            height: 2px;
            background: #cbd5e1;
            margin-top: 28px;
          }
        }

        /* CTA */
        .cta-section {
          padding: 80px 5%;
        }
        .cta-box {
          max-width: 900px;
          margin: 0 auto;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: white;
          padding: 60px 40px;
          text-align: center;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
        }
        .cta-box h2 {
          color: white;
          font-size: 2.2rem;
          margin-bottom: 16px;
        }
        .cta-box p {
          color: #94a3b8;
          font-size: 1.1rem;
          margin-bottom: 40px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .primary-btn.lg {
          padding: 18px 40px;
          font-size: 1.1rem;
          border-radius: 99px;
          margin: 0 auto;
          background: var(--primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Footer */
        .lp-footer {
          padding: 40px 5%;
          border-top: 1px solid #e2e8f0;
          background: white;
        }
        .footer-content {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.2rem;
          }
          .hero-description {
            font-size: 1rem;
          }
          .section-header h2 {
            font-size: 1.8rem;
          }
          .cta-box {
            padding: 40px 20px;
          }
          .cta-box h2 {
            font-size: 1.8rem;
          }
        }
      `}</style>
    </div>
  );
}
