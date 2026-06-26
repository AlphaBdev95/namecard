import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import SetupForm from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
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

  // 이미 프로필이 완성돼 있으면 인박스로.
  if (me && me.team && me.name) redirect("/");

  return <SetupForm userId={user.id} initialName={me?.name ?? ""} />;
}
