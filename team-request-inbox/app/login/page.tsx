"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="auth">
        <div className="auth-top">
          <div className="brandmark">
            <span className="dot" /> 요청함
          </div>
          <h1>
            흘러가는 업무 요청을
            <br />한 곳에 쌓아두세요
          </h1>
          <p className="sub">
            전화·카톡으로 받던 요청이 사라지지 않게. 미팅 다녀와서 켜보면 할 일이
            순서대로 정리돼 있어요.
          </p>
          {error && <p className="auth-err">{error}</p>}
          <button className="oauth-btn" onClick={signIn} disabled={loading}>
            <svg viewBox="0 0 24 24" width="19" height="19">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.64v3h3.86c2.26-2.08 3.56-5.15 3.56-8.88z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29a7.21 7.21 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.96 11.96 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            {loading ? "이동 중…" : "Google로 시작하기"}
          </button>
        </div>
        <div className="auth-foot">
          로그인하면 같은 팀원들에게 업무 요청을 주고받을 수 있어요
        </div>
      </div>
    </div>
  );
}
