import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import type { RequestRow } from "@/lib/types";

export const runtime = "nodejs";

// 새 요청을 보낸 직후 클라이언트가 호출 → 받는 사람에게 웹 푸시 1회.
export async function POST(req: Request) {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    // 키가 아직 설정 안 됐으면 조용히 통과(앱 동작에는 지장 없음).
    return NextResponse.json({ ok: false, reason: "push not configured" });
  }

  let requestId: string | undefined;
  try {
    ({ requestId } = await req.json());
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!requestId) {
    return NextResponse.json({ error: "missing requestId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 요청 조회 (RLS: 보낸 사람은 읽을 수 있음) — 본문/검증용
  const { data: reqRow } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single<RequestRow>();
  if (!reqRow || reqRow.from_user !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: sender } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single<{ name: string }>();

  // 받는 사람의 구독 정보는 보안 함수(SECURITY DEFINER)로 조회.
  // 함수 내부에서 "내가 이 요청의 보낸 사람인지" 검증하므로 service_role 불필요.
  const { data: rpcData } = await supabase.rpc("push_targets", {
    req_id: requestId,
  });
  const targets = (rpcData ?? []) as {
    subscription: webpush.PushSubscription;
  }[];

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@request-inbox.app",
    vapidPublic,
    vapidPrivate,
  );

  const payload = JSON.stringify({
    title: `${sender?.name ?? "동료"}님의 새 요청`,
    body: reqRow.body.slice(0, 120),
    url: "/",
  });

  let sent = 0;
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification(t.subscription, payload);
        sent++;
      } catch {
        // 만료된 구독은 다음 로그인 시 자동 갱신되므로 여기서는 무시.
      }
    }),
  );

  return NextResponse.json({ ok: true, sent });
}
