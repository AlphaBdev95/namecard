export function initials(name: string): string {
  return name ? name.slice(0, 1) : "?";
}

export function timeAgo(iso: string): string {
  const ts = new Date(iso).getTime();
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return Math.floor(s / 60) + "분 전";
  if (s < 86400) return Math.floor(s / 3600) + "시간 전";
  const d = Math.floor(s / 86400);
  if (d < 7) return d + "일 전";
  const date = new Date(ts);
  return pad(date.getMonth() + 1) + "/" + pad(date.getDate());
}

export function dueInfo(
  due: string | null,
): { label: string; soon: boolean } | null {
  if (!due) return null;
  const d = new Date(due + "T23:59:59").getTime();
  const days = Math.ceil((d - Date.now()) / 864e5);
  if (days < 0) return { label: "기한 지남", soon: true };
  if (days === 0) return { label: "오늘까지", soon: true };
  if (days === 1) return { label: "내일까지", soon: true };
  return { label: due.slice(5).replace("-", "/") + "까지", soon: false };
}

function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
