import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, RequestRow } from "@/lib/types";
import Inbox from "@/components/Inbox";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // 프로필이 없거나(트리거 누락 대비) 팀이 비어 있으면 셋업으로.
  if (!me || !me.team || !me.name) redirect("/setup");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("team", { ascending: true })
    .order("name", { ascending: true })
    .returns<Profile[]>();

  const { data: requests } = await supabase
    .from("requests")
    .select("*")
    .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .returns<RequestRow[]>();

  return (
    <Inbox
      me={me}
      profiles={profiles ?? []}
      initialRequests={requests ?? []}
    />
  );
}
