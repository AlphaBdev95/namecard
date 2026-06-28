"use client";

import { useEffect } from "react";

// 서비스 워커 등록 — PWA 설치 가능 상태로 만든다.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
