-- =============================================================
-- 웹 푸시 알림용 구독 테이블 — Supabase SQL Editor 에 붙여넣고 실행하세요.
-- (요청 인박스 기본 스키마를 이미 적용한 뒤 추가로 실행)
-- =============================================================

create table if not exists public.push_subscriptions (
  endpoint     text primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  subscription jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- 본인 구독만 보기/추가/수정/삭제 (푸시 발송은 서버의 service_role 이 처리).
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 푸시 대상 조회 함수: "내가 보낸 요청"의 받는 사람 구독만 반환.
-- SECURITY DEFINER 로 RLS를 우회하되, 함수 안에서 보낸 사람 본인인지 검증한다.
create or replace function public.push_targets(req_id uuid)
returns table (subscription jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select ps.subscription
  from public.requests r
  join public.push_subscriptions ps on ps.user_id = r.to_user
  where r.id = req_id and r.from_user = auth.uid();
end;
$$;

grant execute on function public.push_targets(uuid) to authenticated;
