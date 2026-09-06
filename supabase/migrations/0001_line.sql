-- LINE OA backend scaffold. Intentionally undeployed.
-- Supabase owns auth.users/auth.uid(); local tests create compatible stubs only.
create extension if not exists pgcrypto;

create table public.providers (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
insert into public.providers(id) select id from auth.users on conflict (id) do nothing;
create function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.providers(id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
create trigger create_provider_after_auth_signup
after insert on auth.users for each row execute function public.handle_new_auth_user();
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
create table public.clients (
  provider_id uuid not null references public.providers(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  primary key (provider_id, id)
);
create table public.chats (
  provider_id uuid not null, id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  sender text not null check (sender in ('client', 'provider')),
  body text not null check (length(btrim(body)) > 0),
  occurred_at timestamptz not null default now(),
  source_event_id text,
  primary key (provider_id, id),
  foreign key (provider_id, client_id) references public.clients(provider_id, id) on delete cascade,
  unique (provider_id, source_event_id)
);
create table public.line_channels (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  bot_user_id text unique not null,
  channel_secret text not null, access_token text not null,
  display_name text,
  status text not null default 'pending'
    check (status in ('pending','active','setup_failed','invalid','disabled')),
  quota_used integer not null default 0 check (quota_used >= 0),
  quota_reserved integer not null default 0 check (quota_reserved >= 0),
  quota_limit integer not null default 300 check (quota_limit > 0),
  quota_month date not null default date_trunc('month', now() at time zone 'Asia/Bangkok')::date,
  last_verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.line_recipients (
  provider_id uuid not null references public.providers(id) on delete cascade,
  id uuid not null default gen_random_uuid(), client_id uuid,
  line_user_id text not null, display_name text,
  linked_at timestamptz, unfollowed_at timestamptz,
  primary key (provider_id, id),
  foreign key (provider_id, client_id) references public.clients(provider_id, id) on delete set null (client_id),
  unique (provider_id, line_user_id)
);
create table public.line_link_codes (
  provider_id uuid not null references public.providers(id) on delete cascade,
  code text not null check (code ~ '^[0-9]{6}$'), client_id uuid not null,
  expires_at timestamptz not null, used_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (provider_id, code),
  foreign key (provider_id, client_id) references public.clients(provider_id, id) on delete cascade
);
create table public.line_link_attempts (
  provider_id uuid not null, line_user_id text not null,
  window_started timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  primary key (provider_id, line_user_id),
  foreign key (provider_id, line_user_id)
    references public.line_recipients(provider_id, line_user_id) on delete cascade
);
create table public.message_outbox (
  provider_id uuid not null references public.providers(id) on delete cascade,
  id uuid not null default gen_random_uuid(), recipient_id uuid not null,
  message_id text not null, body text not null check (length(btrim(body)) > 0),
  dedupe_key text not null, retry_key uuid not null default gen_random_uuid(),
  status text not null default 'queued'
    check (status in ('queued','processing','sent','failed','skipped','manual_review')),
  attempts integer not null default 0 check (attempts >= 0), error text,
  scheduled_at timestamptz not null default now(),
  first_attempt_at timestamptz,
  quota_month date,
  auto_day date,
  claimed_at timestamptz, claim_token uuid, sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (provider_id, id),
  foreign key (provider_id, recipient_id) references public.line_recipients(provider_id, id) on delete cascade,
  unique (provider_id, dedupe_key), unique (provider_id, retry_key),
  check ((status = 'processing') = (claim_token is not null and claimed_at is not null))
);
create table public.line_webhook_events (
  provider_id uuid not null references public.providers(id) on delete cascade,
  event_id text not null,
  status text not null default 'processing' check (status in ('processing','processed','failed')),
  claim_token uuid not null default gen_random_uuid(),
  claimed_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  primary key (provider_id, event_id)
);

alter table public.providers enable row level security;
alter table public.clients enable row level security;
alter table public.chats enable row level security;
alter table public.line_channels enable row level security;
alter table public.line_recipients enable row level security;
alter table public.line_link_codes enable row level security;
alter table public.line_link_attempts enable row level security;
alter table public.message_outbox enable row level security;
alter table public.line_webhook_events enable row level security;
create policy providers_read_own on public.providers for select using (id = auth.uid());
create policy clients_read_own on public.clients for select using (provider_id = auth.uid());
create policy chats_read_own on public.chats for select using (provider_id = auth.uid());
create policy channels_read_own on public.line_channels for select using (provider_id = auth.uid());
create policy recipients_read_own on public.line_recipients for select using (provider_id = auth.uid());
create policy codes_read_own on public.line_link_codes for select using (provider_id = auth.uid());
create policy outbox_read_own on public.message_outbox for select using (provider_id = auth.uid());

revoke all on public.providers, public.clients, public.chats, public.line_channels,
  public.line_recipients, public.line_link_codes, public.line_link_attempts,
  public.message_outbox, public.line_webhook_events from anon, authenticated;
grant all on public.providers, public.clients, public.chats, public.line_channels,
  public.line_recipients, public.line_link_codes, public.line_link_attempts,
  public.message_outbox, public.line_webhook_events to service_role;
grant select on public.providers, public.clients, public.chats, public.line_recipients,
  public.line_link_codes, public.message_outbox to authenticated;
grant select (provider_id, bot_user_id, display_name, status, quota_used, quota_limit,
  quota_month, last_verified_at, created_at) on public.line_channels to authenticated;
create view public.line_channel_public with (security_invoker = true) as
  select provider_id, bot_user_id, display_name, status, quota_used, quota_limit,
    quota_month, last_verified_at from public.line_channels;
revoke all on public.line_channel_public from public, anon;
grant select on public.line_channel_public to authenticated;

-- Generates a cryptographic six-digit code and retries collisions without overwriting.
create function public.issue_line_link_code(
  p_client_id uuid, p_expires_at timestamptz default now() + interval '24 hours'
) returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_provider_id uuid := auth.uid(); v_code text;
begin
  if v_provider_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '24 hours' then
    raise exception 'invalid expiry' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clients c where c.provider_id = v_provider_id and c.id = p_client_id) then
    raise exception 'client not found' using errcode = '23503';
  end if;
  for v_try in 1..10 loop
    v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
    begin
      insert into public.line_link_codes(provider_id, code, client_id, expires_at)
      values (v_provider_id, v_code, p_client_id, p_expires_at);
      return query select v_code, p_expires_at; return;
    exception when unique_violation then null;
    end;
  end loop;
  raise exception 'could not allocate link code' using errcode = '40001';
end $$;

-- Attempt count, expiry/one-use check, recipient link, and redemption are one transaction.
create function public.redeem_line_link_code(
  p_provider_id uuid, p_line_user_id text, p_code text
) returns table (ok boolean, client_id uuid, reason text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_attempts integer; v_client_id uuid; v_rows integer;
begin
  if p_code !~ '^[0-9]{6}$' then return query select false, null::uuid, 'invalid'; return; end if;
  insert into public.line_link_attempts(provider_id, line_user_id, window_started, attempts)
  values (p_provider_id, p_line_user_id, now(), 1)
  on conflict (provider_id, line_user_id) do update set
    attempts = case when line_link_attempts.window_started <= now() - interval '1 hour'
      then 1 else line_link_attempts.attempts + 1 end,
    window_started = case when line_link_attempts.window_started <= now() - interval '1 hour'
      then now() else line_link_attempts.window_started end
  returning attempts into v_attempts;
  if v_attempts > 5 then return query select false, null::uuid, 'rate-limited'; return; end if;
  update public.line_link_codes c set used_at = now()
  where c.provider_id = p_provider_id and c.code = p_code and c.used_at is null and c.expires_at > now()
  returning c.client_id into v_client_id;
  if v_client_id is null then return query select false, null::uuid, 'invalid'; return; end if;
  update public.line_recipients r set client_id = v_client_id, linked_at = now(), unfollowed_at = null
  where r.provider_id = p_provider_id and r.line_user_id = p_line_user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then raise exception 'recipient not found' using errcode = '23503'; end if;
  delete from public.line_link_attempts a where a.provider_id = p_provider_id and a.line_user_id = p_line_user_id;
  return query select true, v_client_id, null::text;
end $$;

-- Server-owned defaults prevent callers from forging sent/attempt/claim fields.
create function public.enqueue_line_message(
  p_recipient_id uuid, p_message_id text, p_body text, p_dedupe_key text,
  p_scheduled_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_provider_id uuid := auth.uid(); v_id uuid;
begin
  if v_provider_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if length(btrim(p_body)) = 0 then raise exception 'empty body' using errcode = '22023'; end if;
  insert into public.message_outbox(provider_id, recipient_id, message_id, body, dedupe_key, scheduled_at)
  values (v_provider_id, p_recipient_id, p_message_id, p_body, p_dedupe_key, p_scheduled_at)
  returning id into v_id;
  return v_id;
end $$;

-- Concurrent workers claim disjoint rows; abandoned claims become eligible after ten minutes.
create function public.claim_line_outbox(
  p_provider_id uuid, p_limit integer default 20, p_auto boolean default false
)
returns table (
  id uuid, recipient_id uuid, body text, attempts integer, retry_key uuid,
  claim_token uuid, line_user_id text, client_id uuid, unfollowed_at timestamptz
) language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_capacity integer; v_expired_claims integer; v_recovered integer; v_claimed integer;
  v_month date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
  v_channel_month date; v_inflight integer;
  v_day date := (now() at time zone 'Asia/Bangkok')::date;
begin
  -- Serialize quota reservation per provider. External fetch still happens outside this transaction.
  select c.quota_month into v_channel_month from public.line_channels c
  where c.provider_id = p_provider_id and c.status = 'active' for update;
  if not found then return; end if;

  -- Keep in-flight reservations across the Bangkok calendar-month boundary.
  if v_channel_month <> v_month then
    update public.message_outbox o set quota_month = v_month
    where o.provider_id = p_provider_id and o.status = 'processing';
    get diagnostics v_inflight = row_count;
    update public.line_channels set quota_month = v_month, quota_used = 0,
      quota_reserved = v_inflight where provider_id = p_provider_id;
  end if;

  -- A retry key is documented by LINE for 24 hours. Stop at 23 hours and require manual review.
  with expired_candidates as (
    select o.provider_id, o.id, o.status from public.message_outbox o
    where o.provider_id = p_provider_id and o.first_attempt_at <= now() - interval '23 hours'
      and o.status in ('queued', 'processing') for update
  ), expired as (
    update public.message_outbox o set status = 'manual_review', error = 'retry-window-expired',
      claim_token = null, claimed_at = null
    from expired_candidates e where o.provider_id = e.provider_id and o.id = e.id
    returning (e.status = 'processing')::integer as was_claimed
  ) select coalesce(sum(was_claimed), 0) into v_expired_claims from expired;
  if v_expired_claims > 0 then
    update public.line_channels set quota_reserved = greatest(0, quota_reserved - v_expired_claims)
    where provider_id = p_provider_id;
  end if;

  -- Recover abandoned claims before reserving them again.
  with recovered as (
    update public.message_outbox o set status = 'queued', claim_token = null, claimed_at = null
    where o.provider_id = p_provider_id and o.status = 'processing'
      and o.claimed_at < now() - interval '10 minutes'
    returning 1
  ) select count(*) into v_recovered from recovered;
  if v_recovered > 0 then
    update public.line_channels set quota_reserved = greatest(0, quota_reserved - v_recovered)
    where provider_id = p_provider_id;
  end if;
  select greatest(0, (case when p_auto then least(c.quota_limit, 280) else c.quota_limit end)
    - c.quota_used - c.quota_reserved)
  into v_capacity from public.line_channels c where c.provider_id = p_provider_id;
  if v_capacity = 0 then return; end if;

  return query
  with eligible as (
    select o.provider_id, o.id, o.recipient_id, o.scheduled_at,
      row_number() over (partition by o.recipient_id order by o.scheduled_at, o.id) as recipient_rank
    from public.message_outbox o
    where o.provider_id = p_provider_id and o.scheduled_at <= now()
      and o.status = 'queued'
      and (not p_auto or not exists (
        select 1 from public.message_outbox sent
        where sent.provider_id = o.provider_id and sent.recipient_id = o.recipient_id
          and sent.auto_day = v_day and sent.status in ('processing', 'sent')
      ))
  ), candidates as (
    select o.provider_id, o.id from public.message_outbox o
    join eligible e on e.provider_id = o.provider_id and e.id = o.id
    where not p_auto or e.recipient_rank = 1
    order by e.scheduled_at, e.id for update of o skip locked
    limit least(greatest(1, least(p_limit, 100)), v_capacity)
  ), claimed as (
    update public.message_outbox o set status = 'processing', claimed_at = now(),
      claim_token = gen_random_uuid(), first_attempt_at = coalesce(o.first_attempt_at, now()),
      quota_month = v_month, auto_day = case when p_auto then v_day else o.auto_day end
    from candidates c where o.provider_id = c.provider_id and o.id = c.id returning o.*
  )
  select c.id, c.recipient_id, c.body, c.attempts, c.retry_key, c.claim_token,
    r.line_user_id, r.client_id, r.unfollowed_at
  from claimed c join public.line_recipients r
    on r.provider_id = c.provider_id and r.id = c.recipient_id
  order by c.scheduled_at, c.id;
  get diagnostics v_claimed = row_count;
  update public.line_channels set quota_reserved = quota_reserved + v_claimed
  where provider_id = p_provider_id;
end
$$;

-- Settles only the worker's claim; sent state and quota increment commit together.
create function public.finish_line_outbox(
  p_provider_id uuid, p_id uuid, p_claim_token uuid, p_outcome text,
  p_error text default null, p_retry_at timestamptz default null
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_recipient_id uuid;
  v_month date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
  v_channel_month date; v_inflight integer;
begin
  -- Same lock order as claim/rollover prevents a boundary deadlock.
  select c.quota_month into v_channel_month from public.line_channels c
  where c.provider_id = p_provider_id for update;
  if not found then return false; end if;
  if v_channel_month <> v_month then
    update public.message_outbox o set quota_month = v_month
    where o.provider_id = p_provider_id and o.status = 'processing';
    get diagnostics v_inflight = row_count;
    update public.line_channels set quota_month = v_month, quota_used = 0,
      quota_reserved = v_inflight where provider_id = p_provider_id;
  end if;
  select o.recipient_id into v_recipient_id from public.message_outbox o
  where o.provider_id = p_provider_id and o.id = p_id
    and o.status = 'processing' and o.claim_token = p_claim_token for update;
  if v_recipient_id is null then return false; end if;
  if p_outcome = 'sent' then
    update public.message_outbox set status = 'sent', attempts = attempts + 1, sent_at = now(),
      error = null, claim_token = null, claimed_at = null where provider_id = p_provider_id and id = p_id;
    update public.line_channels set quota_used = quota_used + 1,
      quota_reserved = greatest(0, quota_reserved - 1) where provider_id = p_provider_id;
  elsif p_outcome = 'retry' and p_retry_at is not null and p_retry_at > now() then
    update public.message_outbox set status = 'queued', attempts = attempts + 1,
      scheduled_at = p_retry_at, error = p_error, claim_token = null, claimed_at = null
    where provider_id = p_provider_id and id = p_id;
  elsif p_outcome in ('failed', 'skipped', 'blocked', 'invalid-token') then
    update public.message_outbox set status = case when p_outcome in ('skipped','invalid-token') then 'skipped' else 'failed' end,
      attempts = attempts + 1, error = coalesce(p_error, p_outcome), claim_token = null, claimed_at = null
    where provider_id = p_provider_id and id = p_id;
    if p_outcome = 'blocked' then
      update public.line_recipients set unfollowed_at = now()
      where provider_id = p_provider_id and id = v_recipient_id;
    elsif p_outcome = 'invalid-token' then
      update public.line_channels set status = 'invalid' where provider_id = p_provider_id;
    end if;
  else raise exception 'invalid outcome' using errcode = '22023';
  end if;
  if p_outcome <> 'sent' then
    update public.line_channels set quota_reserved = greatest(0, quota_reserved - 1)
    where provider_id = p_provider_id;
  end if;
  return true;
end $$;

-- A durable claim stops concurrent/redelivered webhook events before any side effect.
create function public.claim_line_webhook_event(p_provider_id uuid, p_event_id text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_token uuid;
begin
  if length(btrim(p_event_id)) = 0 then return null; end if;
  insert into public.line_webhook_events(provider_id, event_id)
  values (p_provider_id, p_event_id)
  on conflict (provider_id, event_id) do update set
    status = 'processing', claim_token = gen_random_uuid(), claimed_at = now(), last_error = null
  where line_webhook_events.status = 'failed'
     or (line_webhook_events.status = 'processing'
         and line_webhook_events.claimed_at < now() - interval '10 minutes')
  returning claim_token into v_token;
  return v_token;
end $$;

create function public.finish_line_webhook_event(
  p_provider_id uuid, p_event_id text, p_claim_token uuid,
  p_success boolean, p_error text default null
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.line_webhook_events set
    status = case when p_success then 'processed' else 'failed' end,
    processed_at = case when p_success then now() else null end,
    last_error = case when p_success then null else coalesce(p_error, 'handler-failed') end
  where provider_id = p_provider_id and event_id = p_event_id
    and status = 'processing' and claim_token = p_claim_token;
  return found;
end $$;

revoke all on function public.issue_line_link_code(uuid, timestamptz) from public, anon;
revoke all on function public.redeem_line_link_code(uuid, text, text) from public, anon, authenticated;
revoke all on function public.enqueue_line_message(uuid, text, text, text, timestamptz) from public, anon;
revoke all on function public.claim_line_outbox(uuid, integer, boolean) from public, anon, authenticated;
revoke all on function public.finish_line_outbox(uuid, uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.issue_line_link_code(uuid, timestamptz) to authenticated;
grant execute on function public.enqueue_line_message(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.redeem_line_link_code(uuid, text, text) to service_role;
revoke all on function public.claim_line_webhook_event(uuid, text) from public, anon, authenticated;
revoke all on function public.finish_line_webhook_event(uuid, text, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_line_outbox(uuid, integer, boolean) to service_role;
grant execute on function public.finish_line_outbox(uuid, uuid, uuid, text, text, timestamptz) to service_role;
grant execute on function public.claim_line_webhook_event(uuid, text) to service_role;
grant execute on function public.finish_line_webhook_event(uuid, text, uuid, boolean, text) to service_role;
