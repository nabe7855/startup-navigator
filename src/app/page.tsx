"use client";

import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Layout,
  Lock,
  Rocket,
  UserPlus,
} from "lucide-react";
import React, { useState } from "react";

export default function StartupNavigator() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        // Mocking for now to avoid env issues
        alert("Mock: Authenticating " + email);
        setUser({ email });
      } else {
        alert("Mock: Creating account for " + email);
        setUser({ email });
      }
    } catch (error) {
      console.error(error);
      alert("Error: Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
              Sign Up
            </button>
            <button
              className={isLogin ? "active" : ""}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            <div className="input-group">
              <label>Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
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
              {loading ? "Processing..." : isLogin ? "Login Now" : "Launch Now"}
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-footer">
            By joining, you agree to build your future.
          </p>
        </main>

        <style jsx>{`
          .auth-outer {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
          }

          .auth-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 8px;
          }

          .brand h1 {
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -1px;
          }

          .auth-header p {
            color: var(--text-dim);
            letter-spacing: 1px;
            text-transform: uppercase;
            font-size: 0.8rem;
          }

          .auth-card {
            width: 100%;
            max-width: 440px;
            padding: 40px;
          }

          .auth-tabs {
            display: flex;
            background: var(--bg-soft);
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 32px;
          }

          .auth-tabs button {
            flex: 1;
            padding: 10px;
            border: none;
            background: transparent;
            font-family: var(--font-accent);
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            border-radius: 10px;
            transition: var(--transition-smooth);
          }

          .auth-tabs button.active {
            background: var(--bg-white);
            color: var(--primary);
            box-shadow: var(--shadow-sm);
          }

          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .input-group label {
            display: block;
            margin-bottom: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            color: var(--text-dim);
          }

          .auth-footer {
            margin-top: 32px;
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
          }

          .primary-btn {
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  // Dashboard View (Mock)
  return (
    <div className="dashboard-root">
      <nav className="side-nav animate-in">
        <div className="brand-side">
          <Rocket size={24} color="var(--primary)" />
          <span>SN</span>
        </div>
        <div className="nav-items">
          <button className="nav-icon active">
            <Layout size={20} />
          </button>
          <button className="nav-icon">
            <Calendar size={20} />
          </button>
          <button className="nav-icon">
            <Lock size={20} />
          </button>
        </div>
        <div className="profile-trigger">
          <div className="avatar-small"></div>
        </div>
      </nav>

      <div className="main-content">
        <header className="content-header fade-in">
          <div>
            <h1>Dashboard</h1>
            <p className="welcome">Welcome back, {user.email}</p>
          </div>
          <button className="primary-btn outline-btn">Download PDF</button>
        </header>

        <div className="stats-grid">
          <div className="glass-card stat-card animate-in-up">
            <div className="stat-header">
              <div className="stat-icon-bg">
                <Rocket size={18} color="var(--primary)" />
              </div>
              <span className="stat-label">Progress</span>
            </div>
            <div className="stat-value">50%</div>
            <div className="progress-bar-flat">
              <div className="fill" style={{ width: "50%" }}></div>
            </div>
            <p className="stat-hint">Next: Session 3 (3/12)</p>
          </div>

          <div
            className="glass-card stat-card animate-in-up"
            style={{ animationDelay: "0.1s" }}
          >
            <div className="stat-header">
              <div className="stat-icon-bg">
                <UserPlus size={18} color="var(--accent)" />
              </div>
              <span className="stat-label">Tasks</span>
            </div>
            <div className="stat-value">2 / 4</div>
            <p className="stat-hint">Business Plan Drafted</p>
          </div>
        </div>

        <section
          className="tasks-section glass-card animate-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="section-header">
            <h3>Recent Activity</h3>
            <button className="text-btn">View All</button>
          </div>
          <div className="activity-list">
            <div className="activity-item">
              <CheckCircle size={16} color="var(--accent)" />
              <div className="activity-info">
                <p className="activity-desc">
                  Session 2 Completed: Marketing Strategy
                </p>
                <span className="activity-time">Yesterday at 14:00</span>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-info">
                <p className="activity-desc">
                  New Appointment Booked: Finance Session
                </p>
                <span className="activity-time">2 hours ago</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .dashboard-root {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }

        .side-nav {
          width: 80px;
          background: var(--bg-white);
          border-right: 1px solid var(--border-light);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .brand-side {
          margin-bottom: 60px;
        }

        .nav-items {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
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
          margin-top: auto;
        }

        .avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ddd, #eee);
        }

        .main-content {
          flex: 1;
          padding: 48px 60px;
          max-width: 1100px;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 48px;
        }

        .welcome {
          color: var(--text-dim);
          font-size: 0.9rem;
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
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }

        .stat-card {
          padding: 32px;
        }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-icon-bg {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-soft);
        }

        .stat-label {
          font-weight: 600;
          color: var(--text-muted);
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          font-family: var(--font-accent);
          margin-bottom: 16px;
        }

        .progress-bar-flat {
          width: 100%;
          height: 8px;
          background: var(--bg-soft);
          border-radius: 4px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .progress-bar-flat .fill {
          height: 100%;
          background: var(--primary);
          border-radius: 4px;
        }

        .stat-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .tasks-section {
          padding: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .text-btn {
          border: none;
          background: transparent;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border-light);
        }

        .activity-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--primary);
          margin-top: 4px;
        }

        .activity-desc {
          font-weight: 500;
          margin-bottom: 4px;
        }

        .activity-time {
          font-size: 0.8rem;
          color: var(--text-muted);
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

        @media (max-width: 900px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .main-content {
            padding: 32px 24px;
          }
        }
      `}</style>
    </div>
  );
}
