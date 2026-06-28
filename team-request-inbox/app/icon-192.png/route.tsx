import { ImageResponse } from "next/og";
import { iconElement } from "@/lib/appIcon";

// 매니페스트용 192px 아이콘 (/icon-192.png)
export function GET() {
  return new ImageResponse(iconElement(192), { width: 192, height: 192 });
}
