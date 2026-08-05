create extension if not exists pgcrypto;

create table if not exists public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  order_ref text,
  max_redemptions integer not null default 1 check (max_redemptions between 1 and 10),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  max_completions integer not null default 3 check (max_completions between 1 and 100),
  valid_days integer not null default 7 check (valid_days between 1 and 365),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.access_sessions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.access_codes(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz not null,
  completion_count integer not null default 0 check (completion_count >= 0),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.quiz_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.access_sessions(id) on delete cascade,
  completion_key text not null,
  persona_id text not null,
  created_at timestamptz not null default now(),
  unique (session_id, completion_key)
);

create index if not exists access_codes_created_at_idx
  on public.access_codes (created_at desc);
create index if not exists access_codes_order_ref_idx
  on public.access_codes (order_ref);
create index if not exists access_sessions_code_id_idx
  on public.access_sessions (code_id);
create index if not exists quiz_completions_session_id_idx
  on public.quiz_completions (session_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists access_codes_set_updated_at on public.access_codes;
create trigger access_codes_set_updated_at
before update on public.access_codes
for each row execute function public.set_updated_at();

alter table public.access_codes enable row level security;
alter table public.access_sessions enable row level security;
alter table public.quiz_completions enable row level security;

revoke all on public.access_codes from anon, authenticated;
revoke all on public.access_sessions from anon, authenticated;
revoke all on public.quiz_completions from anon, authenticated;

create or replace function public.redeem_access_code(
  p_code_hash text,
  p_session_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.access_codes%rowtype;
  v_session public.access_sessions%rowtype;
  v_session_expiry timestamptz;
begin
  select *
  into v_code
  from public.access_codes
  where code_hash = p_code_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;
  if v_code.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'disabled_code');
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired_code');
  end if;
  if v_code.redemption_count >= v_code.max_redemptions then
    return jsonb_build_object('ok', false, 'error', 'redemption_limit_reached');
  end if;

  v_session_expiry := now() + make_interval(days => v_code.valid_days);
  if v_code.expires_at is not null then
    v_session_expiry := least(v_session_expiry, v_code.expires_at);
  end if;

  insert into public.access_sessions (code_id, token_hash, expires_at)
  values (v_code.id, p_session_hash, v_session_expiry)
  returning * into v_session;

  update public.access_codes
  set redemption_count = redemption_count + 1
  where id = v_code.id;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session.id,
    'expiresAt', v_session.expires_at,
    'completionCount', 0,
    'maxCompletions', v_code.max_completions,
    'remainingCompletions', v_code.max_completions
  );
end;
$$;

create or replace function public.validate_access_session(p_session_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.access_sessions%rowtype;
  v_code public.access_codes%rowtype;
begin
  select *
  into v_session
  from public.access_sessions
  where token_hash = p_session_hash;

  if not found or v_session.status <> 'active' or v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  select *
  into v_code
  from public.access_codes
  where id = v_session.code_id;

  if not found or v_code.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  update public.access_sessions
  set last_seen_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session.id,
    'expiresAt', v_session.expires_at,
    'completionCount', v_session.completion_count,
    'maxCompletions', v_code.max_completions,
    'remainingCompletions', greatest(v_code.max_completions - v_session.completion_count, 0)
  );
end;
$$;

create or replace function public.complete_quiz_session(
  p_session_hash text,
  p_completion_key text,
  p_persona_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.access_sessions%rowtype;
  v_code public.access_codes%rowtype;
  v_new_count integer;
begin
  select *
  into v_session
  from public.access_sessions
  where token_hash = p_session_hash
  for update;

  if not found or v_session.status <> 'active' or v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  select *
  into v_code
  from public.access_codes
  where id = v_session.code_id;

  if not found or v_code.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  if exists (
    select 1
    from public.quiz_completions
    where session_id = v_session.id and completion_key = p_completion_key
  ) then
    return jsonb_build_object(
      'ok', true,
      'sessionId', v_session.id,
      'expiresAt', v_session.expires_at,
      'completionCount', v_session.completion_count,
      'maxCompletions', v_code.max_completions,
      'remainingCompletions', greatest(v_code.max_completions - v_session.completion_count, 0)
    );
  end if;

  if v_session.completion_count >= v_code.max_completions then
    return jsonb_build_object('ok', false, 'error', 'completion_limit_reached');
  end if;

  insert into public.quiz_completions (session_id, completion_key, persona_id)
  values (v_session.id, p_completion_key, p_persona_id);

  v_new_count := v_session.completion_count + 1;
  update public.access_sessions
  set completion_count = v_new_count, last_seen_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'ok', true,
    'sessionId', v_session.id,
    'expiresAt', v_session.expires_at,
    'completionCount', v_new_count,
    'maxCompletions', v_code.max_completions,
    'remainingCompletions', greatest(v_code.max_completions - v_new_count, 0)
  );
end;
$$;

revoke all on function public.redeem_access_code(text, text) from public, anon, authenticated;
revoke all on function public.validate_access_session(text) from public, anon, authenticated;
revoke all on function public.complete_quiz_session(text, text, text) from public, anon, authenticated;

grant execute on function public.redeem_access_code(text, text) to service_role;
grant execute on function public.validate_access_session(text) to service_role;
grant execute on function public.complete_quiz_session(text, text, text) to service_role;
grant select, insert, update on public.access_codes to service_role;
grant select, insert, update on public.access_sessions to service_role;
grant select, insert on public.quiz_completions to service_role;
