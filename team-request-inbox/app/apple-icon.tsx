import { ImageResponse } from "next/og";
import { iconElement } from "@/lib/appIcon";

// iOS 홈 화면 아이콘 (apple-touch-icon). PNG 필수.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(iconElement(180), { ...size });
}
