// 최소 서비스 워커 — PWA "앱 설치" 자격 조건(fetch 핸들러)을 만족시키기 위함.
// 네트워크 그대로 통과(오프라인 캐시는 두지 않아 항상 최신 화면).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // 네트워크 패스스루: 별도 처리 없이 브라우저 기본 동작에 맡긴다.
});
