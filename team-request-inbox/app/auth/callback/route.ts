import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 소셜 로그인 후 Supabase 가 ?code= 를 들고 돌아오는 곳.
// code 를 세션으로 교환한 뒤 인박스로 보낸다.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
