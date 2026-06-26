"use client";

import { useEffect, useMemo, useState } from "react";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";

export default function ComposeSheet({
  open,
  me,
  profiles,
  onClose,
  onSend,
}: {
  open: boolean;
  me: Profile;
  profiles: Profile[];
  onClose: () => void;
  onSend: (toId: string, body: string, due: string | null) => Promise<void>;
}) {
  const [to, setTo] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [sending, setSending] = useState(false);

  // 시트가 열릴 때마다 입력 초기화.
  useEffect(() => {
    if (open) {
      setTo(null);
      setBody("");
      setDue("");
      setSending(false);
    }
  }, [open]);

  // 나를 제외한 팀원을 부서별로 묶는다.
  const groups = useMemo(() => {
    const others = profiles.filter((p) => p.id !== me.id);
    const map = new Map<string, Profile[]>();
    others.forEach((p) => {
      const key = p.team || "기타";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries());
  }, [profiles, me.id]);

  const canSend = !!to && body.trim().length > 0 && !sending;

  async function submit() {
    if (!to || !body.trim()) return;
    setSending(true);
    await onSend(to, body.trim(), due || null);
    // 성공/실패 모두 부모가 시트 상태를 관리. 실패 시 다시 보낼 수 있게 풀어준다.
    setSending(false);
  }

  return (
    <>
      <div
        className={"scrim" + (open ? " on" : "")}
        onClick={sending ? undefined : onClose}
      />
      <div className={"sheet" + (open ? " on" : "")}>
        <div className="grab" />
        <h2>새 요청 보내기</h2>
        <p className="sh-sub">
          받는 사람에게 알림이 가고, 처리될 때까지 사라지지 않아요.
        </p>

        <div className="field">
          <label>누구에게</label>
          {groups.length === 0 ? (
            <p className="sh-sub" style={{ margin: 0 }}>
              아직 다른 팀원이 없어요. 동료가 가입하면 여기에 나타납니다.
            </p>
          ) : (
            groups.map(([team, members]) => (
              <div key={team}>
                <div className="teamgroup">{team}</div>
                <div className="recip">
                  {members.map((p) => (
                    <button
                      key={p.id}
                      className={"rp" + (to === p.id ? " on" : "")}
                      onClick={() => setTo(p.id)}
                      type="button"
                    >
                      <div className="avatar" style={{ background: p.color }}>
                        {initials(p.name)}
                      </div>
                      <div className="rpn">{p.name}</div>
                      <div className="rpt">{p.team}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="field">
          <label>요청 내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="예) 고객사 보낼 견적서 오늘까지 검토 부탁드려요"
          />
        </div>

        <div className="field">
          <label>
            마감일{" "}
            <span style={{ color: "var(--ink-faint)", fontWeight: 600 }}>
              · 선택
            </span>
          </label>
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>

        <button className="submit" onClick={submit} disabled={!canSend}>
          {sending ? "보내는 중…" : "요청 보내기"}
        </button>
      </div>
    </>
  );
}
