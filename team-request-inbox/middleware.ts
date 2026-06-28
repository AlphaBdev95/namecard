import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // _next 정적 파일, 이미지, favicon, PWA 자산(sw/manifest/icon)을 제외한 모든 경로.
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
