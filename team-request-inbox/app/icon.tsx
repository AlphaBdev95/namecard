import { ImageResponse } from "next/og";
import { iconElement } from "@/lib/appIcon";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(iconElement(256), { ...size });
}
