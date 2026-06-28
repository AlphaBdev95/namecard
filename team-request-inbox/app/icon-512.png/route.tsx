import { ImageResponse } from "next/og";
import { iconElement } from "@/lib/appIcon";

// 매니페스트용 512px 아이콘 (/icon-512.png)
export function GET() {
  return new ImageResponse(iconElement(512), { width: 512, height: 512 });
}
