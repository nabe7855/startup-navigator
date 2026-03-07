"use client";

import { supabase } from "@/lib/supabase";
import { ArrowRight, Rocket } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const lastFetchedId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session && mounted) {
          await routeUser(session.user.id);
        }
      } catch (err) {
        console.warn("Auth init error:", err);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    };

    initializeAuth();

    const timeout = setTimeout(() => {
      if (mounted) {
        setAuthChecking(false);
      }
    }, 10000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session && event === "SIGNED_IN") {
        await routeUser(session.user.id);
      } else if (!session) {
        lastFetchedId.current = null;
        setAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  const routeUser = async (userId: string) => {
    if (lastFetchedId.current === userId) return;
    lastFetchedId.current = userId;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 8000),
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

      const role = data?.role || "user";
      router.push(`/${role}`);
    } catch {
      router.push(`/user`);
    }
  };

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
              placeholder="example0@gmail.com"
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
          padding: 16px;
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
          font-size: 1.5rem;
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
          padding: 24px;
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
      `}</style>
    </div>
  );
}
