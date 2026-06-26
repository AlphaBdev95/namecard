"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TEAM_COLORS } from "@/lib/types";

export default function SetupForm({
  userId,
  initialName,
}: {
  userId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && team.trim().length > 0;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    // 팀 이름 해시로 안정적인 아바타 색 선택.
    const color =
      TEAM_COLORS[
        Math.abs(
          team.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
        ) % TEAM_COLORS.length
      ];
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), team: team.trim(), color })
      .eq("id", userId);
    if (error) {
      setError("저장에 실패했어요. 다시 시도해 주세요.");
      setSaving(false);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="app">
      <div className="setup">
        <div className="setup-top">
          <div className="brandmark">
            <span className="dot" /> 요청함
          </div>
          <h1>프로필을 알려주세요</h1>
          <p className="sub">
            팀원들이 요청을 보낼 때 이 이름과 팀으로 표시돼요.
          </p>

          {error && <p className="auth-err">{error}</p>}

          <div className="field">
            <label>이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예) 김영업"
              maxLength={20}
            />
          </div>
          <div className="field">
            <label>팀 / 부서</label>
            <input
              type="text"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder="예) 영업팀"
              maxLength={20}
            />
          </div>

          <button className="submit" onClick={save} disabled={!canSave || saving}>
            {saving ? "저장 중…" : "시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
