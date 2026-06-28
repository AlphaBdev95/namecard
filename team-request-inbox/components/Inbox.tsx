"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { initials, timeAgo, dueInfo } from "@/lib/format";
import {
  STATUS_KO,
  type Profile,
  type RequestRow,
  type RequestStatus,
} from "@/lib/types";
import ComposeSheet from "@/components/ComposeSheet";
import { enablePush, pushSupported } from "@/lib/push";

type Tab = "in" | "out";

export default function Inbox({
  me,
  profiles,
  initialRequests,
}: {
  me: Profile;
  profiles: Profile[];
  initialRequests: RequestRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const byId = useMemo(() => {
    const m: Record<string, Profile> = {};
    profiles.forEach((p) => (m[p.id] = p));
    return m;
  }, [profiles]);

  const [requests, setRequests] = useState<RequestRow[]>(initialRequests);
  const [tab, setTab] = useState<Tab>("in");
  const [showDone, setShowDone] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pushPerm, setPushPerm] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 처음에 이미 알고 있던 안읽음 요청 — 실시간 토스트 중복 방지.
  const knownIncoming = useRef<Set<string>>(
    new Set(
      initialRequests
        .filter((r) => r.to_user === me.id && r.status === "unread")
        .map((r) => r.id),
    ),
  );

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // ---------- 실시간 동기화 ----------
  useEffect(() => {
    const channel = supabase
      .channel("requests-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as RequestRow;
            if (row.to_user !== me.id && row.from_user !== me.id) return;
            setRequests((prev) =>
              prev.some((r) => r.id === row.id) ? prev : [row, ...prev],
            );
            if (
              row.to_user === me.id &&
              row.status === "unread" &&
              !knownIncoming.current.has(row.id)
            ) {
              knownIncoming.current.add(row.id);
              const from = byId[row.from_user];
              flash(`🔔 ${from ? from.name : "동료"}님의 새 요청이 도착했어요`);
            }
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as RequestRow;
            setRequests((prev) =>
              prev.map((r) => (r.id === row.id ? row : r)),
            );
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setRequests((prev) => prev.filter((r) => r.id !== old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, me.id, byId, flash]);

  // ---------- 푸시 알림 ----------
  useEffect(() => {
    if (!pushSupported()) {
      setPushPerm("unsupported");
      return;
    }
    setPushPerm(Notification.permission);
    // 이미 허용돼 있으면 구독 정보를 조용히 최신화.
    if (Notification.permission === "granted") {
      enablePush(supabase, me.id).catch(() => {});
    }
  }, [supabase, me.id]);

  async function turnOnPush() {
    const ok = await enablePush(supabase, me.id);
    setPushPerm(pushSupported() ? Notification.permission : "unsupported");
    flash(ok ? "🔔 알림을 켰어요" : "알림 권한을 허용해 주세요");
  }

  // ---------- 동작 ----------
  async function setStatus(id: string, status: RequestStatus) {
    setBusyId(id);
    // 낙관적 업데이트
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status, updated_at: new Date().toISOString() }
          : r,
      ),
    );
    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      flash("상태를 바꾸지 못했어요");
      router.refresh();
    }
    setBusyId(null);
  }

  async function sendRequest(toId: string, body: string, due: string | null) {
    const { data, error } = await supabase
      .from("requests")
      .insert({ from_user: me.id, to_user: toId, body, due })
      .select("*")
      .single<RequestRow>();
    if (error || !data) {
      flash("요청을 보내지 못했어요");
      return;
    }
    setRequests((prev) =>
      prev.some((r) => r.id === data.id) ? prev : [data, ...prev],
    );
    setComposeOpen(false);
    setTab("out");
    flash(`${byId[toId]?.name ?? "상대"}님에게 요청을 보냈어요`);
    // 받는 사람에게 폰 푸시 알림 발송(설정돼 있으면). 실패해도 무시.
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: data.id }),
    }).catch(() => {});
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // ---------- 파생 데이터 ----------
  const unread = requests.filter(
    (r) => r.to_user === me.id && r.status === "unread",
  ).length;
  const inN = requests.filter(
    (r) => r.to_user === me.id && r.status !== "done",
  ).length;
  const outN = requests.filter(
    (r) => r.from_user === me.id && r.status !== "done",
  ).length;

  const mine = requests
    .filter((r) => (tab === "in" ? r.to_user === me.id : r.from_user === me.id))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  const active = mine.filter((r) => r.status !== "done");
  const done = mine.filter((r) => r.status === "done");

  return (
    <div className="app">
      {/* 헤더 */}
      <div className="hdr">
        <button className="who" onClick={signOut} title="로그아웃">
          <div className="avatar" style={{ background: me.color }}>
            {initials(me.name)}
          </div>
          <div>
            <div className="nm">{me.name}</div>
            <div className="tm">{me.team}</div>
          </div>
          <span className="signout">로그아웃</span>
        </button>
        <button className="bell" onClick={() => setTab("in")} title="받은 요청">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
            <path
              d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {unread > 0 && <span className="badge">{unread}</span>}
        </button>
      </div>

      {/* 탭 */}
      <div className="tabs">
        <button
          className={"tab" + (tab === "in" ? " on" : "")}
          onClick={() => setTab("in")}
        >
          받은 요청 <span className="cnt">{inN}</span>
        </button>
        <button
          className={"tab" + (tab === "out" ? " on" : "")}
          onClick={() => setTab("out")}
        >
          보낸 요청 <span className="cnt">{outN}</span>
        </button>
      </div>

      {/* 리스트 */}
      <div className="list">
        {pushPerm === "default" && (
          <div className="pushbanner">
            <span>📣 새 요청을 폰 알림으로 받을까요?</span>
            <button onClick={turnOnPush}>알림 켜기</button>
          </div>
        )}
        {active.length === 0 && (!showDone || done.length === 0) ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            {active.length > 0 ? (
              active.map((r) => (
                <RequestCard
                  key={r.id}
                  r={r}
                  tab={tab}
                  other={byId[tab === "in" ? r.from_user : r.to_user]}
                  busy={busyId === r.id}
                  onSetStatus={setStatus}
                />
              ))
            ) : (
              <EmptyState tab={tab} />
            )}
            {done.length > 0 && (
              <div className="showdone">
                <button onClick={() => setShowDone((v) => !v)}>
                  {showDone
                    ? "완료된 요청 숨기기"
                    : `완료된 요청 ${done.length}건 보기`}
                </button>
              </div>
            )}
            {showDone &&
              done.map((r) => (
                <RequestCard
                  key={r.id}
                  r={r}
                  tab={tab}
                  other={byId[tab === "in" ? r.from_user : r.to_user]}
                  busy={busyId === r.id}
                  onSetStatus={setStatus}
                />
              ))}
          </>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setComposeOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>{" "}
        새 요청
      </button>

      {/* 작성 시트 */}
      <ComposeSheet
        open={composeOpen}
        me={me}
        profiles={profiles}
        onClose={() => setComposeOpen(false)}
        onSend={sendRequest}
      />

      {/* 토스트 */}
      <div className={"toast" + (toast ? " on" : "")}>
        <span className="tdot" />
        <span>{toast}</span>
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  if (tab === "in") {
    return (
      <div className="empty">
        <div className="ic">📥</div>
        <div className="big">쌓인 요청이 없어요</div>
        <div className="sm">
          미팅 다녀오면 여기에
          <br />
          받은 요청이 순서대로 모입니다.
        </div>
      </div>
    );
  }
  return (
    <div className="empty">
      <div className="ic">📤</div>
      <div className="big">보낸 요청이 없어요</div>
      <div className="sm">
        아래 ‘새 요청’으로
        <br />
        다른 팀에 업무를 남겨보세요.
      </div>
    </div>
  );
}

function RequestCard({
  r,
  tab,
  other,
  busy,
  onSetStatus,
}: {
  r: RequestRow;
  tab: Tab;
  other?: Profile;
  busy: boolean;
  onSetStatus: (id: string, status: RequestStatus) => void;
}) {
  const di = dueInfo(r.due);
  const otherName = other?.name ?? "알 수 없음";
  const otherTeam = other?.team ?? "";
  const otherColor = other?.color ?? "#9AA3B2";

  let button: React.ReactNode = null;
  if (tab === "in") {
    if (r.status === "unread") {
      button = (
        <button
          className="act primary"
          disabled={busy}
          onClick={() => onSetStatus(r.id, "confirmed")}
        >
          확인
        </button>
      );
    } else if (r.status === "confirmed") {
      button = (
        <button
          className="act ok"
          disabled={busy}
          onClick={() => onSetStatus(r.id, "done")}
        >
          완료
        </button>
      );
    } else {
      button = (
        <button
          className="act ghost"
          disabled={busy}
          onClick={() => onSetStatus(r.id, "confirmed")}
        >
          되돌리기
        </button>
      );
    }
  }

  const statusLabel =
    tab === "out" && r.status === "unread" ? "상대 미확인" : STATUS_KO[r.status];

  return (
    <div className={"card s-" + r.status}>
      <div className="crow">
        <div className="ca" style={{ background: otherColor }}>
          {initials(otherName)}
        </div>
        <div className="cfrom">
          <span>{tab === "in" ? "받음 ·" : "보냄 ·"}</span> {otherName}{" "}
          <span>{otherTeam}</span>
        </div>
        <div className="ctime">{timeAgo(r.created_at)}</div>
      </div>
      <div className="ctext">{r.body}</div>
      <div className="cfoot">
        {di && (
          <span className={"chip due" + (di.soon ? " soon" : "")}>
            🕑 {di.label}
          </span>
        )}
        <span className={"statuspill s-" + r.status}>{statusLabel}</span>
        {button && <div className="btnrow">{button}</div>}
      </div>
    </div>
  );
}
