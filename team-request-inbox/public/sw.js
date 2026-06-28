// PWA 서비스 워커 — 오프라인 대응 + 웹 푸시 수신.
const CACHE = "request-inbox-v3";
const OFFLINE_URL = "/login";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  // 페이지 이동 요청: 네트워크 우선, 오프라인이면 캐시된 로그인 화면으로 폴백.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});

// 웹 푸시 수신 → 폰 알림 표시
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "새 요청이 도착했어요";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [80, 40, 80],
    data: { url: data.url || "/" },
    tag: "new-request",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 → 앱 열기(이미 열려 있으면 그 창으로 포커스)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
