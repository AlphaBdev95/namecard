import type { MetadataRoute } from "next";

// PWA 매니페스트 — 홈 화면에 추가 시 앱처럼(전체화면) 동작.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "요청함 — 팀 간 업무 요청 인박스",
    short_name: "요청함",
    description:
      "전화·카톡으로 받던 요청이 사라지지 않게. 완료될 때까지 목록에 남습니다.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#EEF1F6",
    theme_color: "#2B4A8B",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
