export type RequestStatus = "unread" | "confirmed" | "done";

export interface Profile {
  id: string;
  name: string;
  team: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface RequestRow {
  id: string;
  from_user: string;
  to_user: string;
  body: string;
  due: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export const STATUS_KO: Record<RequestStatus, string> = {
  unread: "안읽음",
  confirmed: "확인함",
  done: "완료",
};

// 프로토타입과 동일한 팀별 아바타 색 팔레트 (프로필 색이 없을 때 fallback)
export const TEAM_COLORS = [
  "#2B4A8B",
  "#C2557A",
  "#2E7D6B",
  "#C77B2B",
  "#6B5BBD",
];
