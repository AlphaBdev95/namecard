// 앱 아이콘 도안 — 폰트 없이 div 도형만 사용(한글/이모지 렌더 문제 회피).
// 네이비 배경 + 흰 카드 + 왼쪽 주황 띠 = 앱의 상태 색 띠 UX 모티프.
export function iconElement(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#16213D",
      }}
    >
      <div
        style={{
          display: "flex",
          width: `${Math.round(size * 0.6)}px`,
          height: `${Math.round(size * 0.42)}px`,
          background: "#ffffff",
          borderRadius: `${Math.round(size * 0.09)}px`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(size * 0.1)}px`,
            height: "100%",
            background: "#E08A2B",
          }}
        />
      </div>
    </div>
  );
}
