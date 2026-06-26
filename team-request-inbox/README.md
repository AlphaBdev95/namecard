# 팀 간 업무 요청 인박스

전화·카톡으로 받던 업무 요청이 휘발되지 않도록, **완료될 때까지 목록에 남는** 팀 간 요청 인박스입니다.
[`PROJECT_BRIEF.md`](./PROJECT_BRIEF.md)의 MVP 명세를 그대로 구현했고, UI는 [`docs/prototype.html`](./docs/prototype.html) 프로토타입을 디자인 기준으로 삼았습니다.

## 기술 스택

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Supabase** — 인증(소셜 로그인) · Postgres · 실시간 동기화
- **Vercel** 배포 권장

## 구현된 MVP 기능

| 브리프 항목 | 구현 |
| --- | --- |
| 소셜 로그인 | Google OAuth (Supabase Auth) — `app/login` |
| 요청 생성 | 받는 사람·내용·마감일(선택), 보낸 사람 자동 — `components/ComposeSheet.tsx` |
| 받는 사람 인박스 | 최신순 카드, 완료 전까지 유지 — `components/Inbox.tsx` |
| 상태 3단계 | `안읽음 / 확인함 / 완료`, 완료 시 인박스에서 내려감 |
| 보낸 사람 상태 확인 | "보낸 요청" 탭에서 실시간 상태 표시 |
| 알림 | 새 요청 도착 시 실시간 토스트 (웹 푸시는 다음 단계) |
| 받는 사람 선택 | 가입 팀원이 **부서별로 묶여** 자동 노출 |

> 카드 왼쪽 상태 색 띠(안읽음=주황 / 확인함=파랑 / 완료=초록)가 핵심 UX입니다.

## 로컬 실행

### 1. Supabase 프로젝트 만들기

1. <https://supabase.com> 에서 프로젝트 생성
2. **SQL Editor** 에 [`supabase/schema.sql`](./supabase/schema.sql) 전체를 붙여넣고 실행
   - `profiles`, `requests` 테이블, RLS 정책, 신규 가입 트리거, 실시간 발행까지 한 번에 설정됩니다.

### 2. Google 소셜 로그인 설정

1. [Google Cloud Console](https://console.cloud.google.com/) 에서 OAuth 2.0 클라이언트 ID 발급
   - 승인된 리디렉션 URI: `https://<프로젝트>.supabase.co/auth/v1/callback`
2. Supabase **Authentication → Providers → Google** 에 Client ID / Secret 입력 후 활성화
3. Supabase **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (배포 후엔 Vercel 도메인)
   - Redirect URLs 에 `http://localhost:3000/auth/callback` 추가

> 카카오 로그인을 쓰려면 동일한 방식으로 Provider 만 바꾸고 `app/login/page.tsx`의 `provider: "google"` 를 `"kakao"` 로 변경하면 됩니다.

### 3. 환경변수

```bash
cp .env.example .env.local
```

`.env.local` 에 Supabase **Project Settings → API** 의 값을 채웁니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://<프로젝트>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### 4. 실행

```bash
npm install
npm run dev
```

<http://localhost:3000> 접속 → Google 로그인 → 첫 로그인 시 이름·팀 입력(`/setup`) → 인박스.

## 배포 (Vercel)

1. 이 디렉터리를 루트로 Vercel 프로젝트 연결 (Root Directory: `team-request-inbox`)
2. 환경변수 두 개(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 등록
3. 배포 후 Supabase URL Configuration 의 Site URL / Redirect URL 을 Vercel 도메인으로 갱신

## 폴더 구조

```
app/
  login/          소셜 로그인
  setup/          첫 로그인 시 프로필(이름·팀) 입력
  auth/callback/  OAuth 코드 → 세션 교환
  page.tsx        인박스(서버에서 데이터 fetch)
components/
  Inbox.tsx       메인 UI · 실시간 구독 · 상태 변경
  ComposeSheet.tsx 새 요청 작성(부서별 받는 사람 선택)
  SetupForm.tsx   프로필 설정
lib/
  supabase/       브라우저·서버·미들웨어 클라이언트
  types.ts        Profile / RequestRow 타입
  format.ts       날짜·시간 표시 유틸
supabase/
  schema.sql      DB 스키마 + RLS + 트리거 + 실시간
middleware.ts     세션 갱신 · 보호 라우트
```

## 의도적으로 뺀 것 (MVP 이후)

웹 푸시 알림, 마감 임박/재알림, 캘린더 연동, 우선순위 자동 정렬, 통계 — 브리프의 "일부러 빼는 것" 항목을 따릅니다. 현재 알림은 앱이 열려 있을 때의 실시간 토스트로 구현했고, 실제 웹 푸시(Web Push)는 다음 단계입니다.
