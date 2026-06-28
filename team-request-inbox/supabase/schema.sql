-- =============================================================
-- 팀 간 업무 요청 인박스 — DB 스키마
-- Supabase SQL Editor 에 그대로 붙여넣어 실행하세요.
-- (auth.users 는 Supabase 가 자동 관리. 여기서는 프로필/요청만 다룹니다.)
-- =============================================================

-- ---------- 1. 프로필 ----------
-- 가입한 팀원 정보. auth.users 와 1:1.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  team        text not null default '',
  color       text not null default '#2B4A8B',   -- 아바타 색
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- 2. 요청 ----------
-- 상태 3단계: unread(안읽음) / confirmed(확인함) / done(완료)
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles (id) on delete cascade,
  to_user     uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  due         date,
  status      text not null default 'unread'
              check (status in ('unread', 'confirmed', 'done')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists requests_to_user_idx   on public.requests (to_user, created_at desc);
create index if not exists requests_from_user_idx on public.requests (from_user, created_at desc);

-- ---------- 3. updated_at 자동 갱신 ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists requests_touch_updated_at on public.requests;
create trigger requests_touch_updated_at
  before update on public.requests
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- 4. 신규 가입 시 프로필 자동 생성 ----------
-- 소셜 로그인으로 새 유저가 생기면 빈 프로필을 만들어 둔다.
-- 이름/팀은 /setup 화면에서 채운다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 5. Row Level Security (RLS)
-- =============================================================
alter table public.profiles enable row level security;
alter table public.requests enable row level security;

-- 프로필: 로그인한 사람은 팀원 목록을 모두 볼 수 있다(받는 사람 선택용).
drop policy if exists "profiles are viewable by authenticated users" on public.profiles;
create policy "profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- 프로필: 본인 것만 수정/삽입.
drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 요청: 보낸 사람 또는 받는 사람만 조회.
drop policy if exists "requests visible to sender or recipient" on public.requests;
create policy "requests visible to sender or recipient"
  on public.requests for select
  to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

-- 요청 생성: 보낸 사람은 반드시 본인.
drop policy if exists "users can send requests as themselves" on public.requests;
create policy "users can send requests as themselves"
  on public.requests for insert
  to authenticated
  with check (auth.uid() = from_user);

-- 상태 변경: 받는 사람만 (확인/완료/되돌리기).
drop policy if exists "recipient can update status" on public.requests;
create policy "recipient can update status"
  on public.requests for update
  to authenticated
  using (auth.uid() = to_user)
  with check (auth.uid() = to_user);

-- =============================================================
-- 6. 실시간(Realtime) 활성화
-- 보낸 사람이 상태 변화를 실시간으로 보고, 받는 사람이 새 요청을 즉시 받도록.
-- =============================================================
alter publication supabase_realtime add table public.requests;

-- =============================================================
-- 7. 웹 푸시 알림용 구독 테이블
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

drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 푸시 대상 조회 함수: "내가 보낸 요청"의 받는 사람 구독만 반환.
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
