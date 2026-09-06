\set ON_ERROR_STOP on
insert into auth.users(id) values
  ('10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002');
do $$ begin
  if (select count(*) from public.providers) <> 2 then
    raise exception 'auth signup did not create provider prerequisites';
  end if;
end $$;
insert into public.clients(provider_id, id, name) values
  ('10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'owner client'),
  ('20000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'other client');
insert into public.line_channels(provider_id, bot_user_id, channel_secret, access_token, status) values
  ('10000000-0000-0000-0000-000000000001', 'bot-owner', 'secret-owner', 'token-owner', 'active'),
  ('20000000-0000-0000-0000-000000000002', 'bot-other', 'secret-other', 'token-other', 'active');
insert into public.line_recipients(provider_id, id, client_id, line_user_id, linked_at) values
  ('10000000-0000-0000-0000-000000000001', '11100000-0000-0000-0000-000000000001',
   '11000000-0000-0000-0000-000000000001', 'line-owner', now()),
  ('20000000-0000-0000-0000-000000000002', '22200000-0000-0000-0000-000000000002',
   '22000000-0000-0000-0000-000000000002', 'line-other', now());

set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
begin
  if (select count(*) from public.line_channel_public) <> 1 then
    raise exception 'owner must see exactly one channel';
  end if;
  if (select provider_id from public.line_channel_public) <> '10000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'RLS exposed another owner';
  end if;
  if has_column_privilege('authenticated', 'public.line_channels', 'channel_secret', 'select')
     or has_column_privilege('authenticated', 'public.line_channels', 'access_token', 'select') then
    raise exception 'authenticated role can read a LINE secret';
  end if;
  if has_table_privilege('authenticated', 'public.message_outbox', 'insert')
     or has_table_privilege('authenticated', 'public.message_outbox', 'update') then
    raise exception 'authenticated role can forge delivery fields';
  end if;
end $$;
select * from public.issue_line_link_code(
  '11000000-0000-0000-0000-000000000001', now() + interval '1 hour'
) \gset issued_
select set_config('test.issued_code', :'issued_code', false);
do $$
begin
  if current_setting('test.issued_code') !~ '^[0-9]{6}$' then raise exception 'issued code is malformed'; end if;
  if not exists (select 1 from public.line_link_codes
    where provider_id = auth.uid() and code = current_setting('test.issued_code')) then
    raise exception 'issued code was not scoped to authenticated owner';
  end if;
end $$;

select public.enqueue_line_message(
  '11100000-0000-0000-0000-000000000001', 'message-1', 'hello', 'dedupe-1', now()
) as queued_id \gset
select set_config('test.queued_id', :'queued_id', false);
do $$
begin
  if (select status <> 'queued' or attempts <> 0 or sent_at is not null or retry_key is null
      from public.message_outbox where id = current_setting('test.queued_id')::uuid) then
    raise exception 'enqueue did not preserve server-owned defaults';
  end if;
end $$;
reset role;

set role service_role;
select public.claim_line_webhook_event(
  '10000000-0000-0000-0000-000000000001', 'event-1'
) as webhook_token \gset
select set_config('test.webhook_token', :'webhook_token', false);
do $$
begin
  if current_setting('test.webhook_token', true) = '' then raise exception 'first webhook claim failed'; end if;
  if public.claim_line_webhook_event(
    '10000000-0000-0000-0000-000000000001', 'event-1'
  ) is not null then raise exception 'duplicate webhook event was claimed'; end if;
  if not public.finish_line_webhook_event(
    '10000000-0000-0000-0000-000000000001', 'event-1',
    current_setting('test.webhook_token')::uuid, true, null
  ) then raise exception 'webhook claim could not finish'; end if;
  if public.claim_line_webhook_event(
    '10000000-0000-0000-0000-000000000001', 'event-1'
  ) is not null then raise exception 'processed webhook redelivery was claimed'; end if;
end $$;
reset role;

update public.message_outbox set status = 'failed', error = 'test-cleanup',
  claim_token = null, claimed_at = null where status = 'processing';
update public.line_channels set quota_used = 0, quota_reserved = 0
where provider_id = '10000000-0000-0000-0000-000000000001';
insert into public.message_outbox(provider_id, recipient_id, message_id, body, dedupe_key)
values
  ('10000000-0000-0000-0000-000000000001',
   '11100000-0000-0000-0000-000000000001', 'auto-one', 'one', 'auto-one'),
  ('10000000-0000-0000-0000-000000000001',
   '11100000-0000-0000-0000-000000000001', 'auto-two', 'two', 'auto-two');
set role service_role;
do $$
declare v_count integer;
begin
  select count(*) into v_count from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20, true
  );
  if v_count <> 1 then raise exception 'auto claim did not limit recipient to one message'; end if;
  select count(*) into v_count from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20, true
  );
  if v_count <> 0 then raise exception 'second auto claim repeated recipient in Bangkok day'; end if;
  select count(*) into v_count from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20, false
  );
  if v_count <> 2 then raise exception 'manual claim was incorrectly limited to one per day'; end if;
end $$;
reset role;

update public.message_outbox set status = 'failed', error = 'test-cleanup',
  claim_token = null, claimed_at = null where status = 'processing';
update public.line_channels set quota_reserved = 0
where provider_id = '10000000-0000-0000-0000-000000000001';
insert into public.message_outbox(provider_id, recipient_id, message_id, body, dedupe_key)
values ('10000000-0000-0000-0000-000000000001',
  '11100000-0000-0000-0000-000000000001', 'message-standard', 'standard', 'standard');

do $$
begin
  begin
    insert into public.line_link_codes(provider_id, code, client_id, expires_at)
    values ('10000000-0000-0000-0000-000000000001', '999999',
            '22000000-0000-0000-0000-000000000002', now() + interval '1 hour');
    raise exception 'cross-tenant client reference was accepted';
  exception when foreign_key_violation then null;
  end;
  begin
    insert into public.message_outbox(provider_id, recipient_id, message_id, body, dedupe_key)
    values ('10000000-0000-0000-0000-000000000001',
            '22200000-0000-0000-0000-000000000002', 'forged', 'bad', 'cross-tenant');
    raise exception 'cross-tenant recipient reference was accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

insert into public.line_recipients(provider_id, id, line_user_id) values
  ('10000000-0000-0000-0000-000000000001',
   '11100000-0000-0000-0000-000000000009', 'line-redeem');
insert into public.line_link_codes(provider_id, code, client_id, expires_at) values
  ('10000000-0000-0000-0000-000000000001', '123456',
   '11000000-0000-0000-0000-000000000001', now() + interval '1 hour');

set role service_role;
select * from public.claim_line_outbox('10000000-0000-0000-0000-000000000001', 20) \gset claim_
select set_config('test.claim_id', :'claim_id', false);
select set_config('test.claim_token', :'claim_claim_token', false);
select set_config('test.retry_key', :'claim_retry_key', false);
do $$
begin
  if current_setting('test.retry_key')::uuid is null or current_setting('test.claim_token')::uuid is null then
    raise exception 'claim omitted stable retry/claim key';
  end if;
  if not public.finish_line_outbox(
    '10000000-0000-0000-0000-000000000001', current_setting('test.claim_id')::uuid,
    current_setting('test.claim_token')::uuid,
    'sent', null, null
  ) then raise exception 'valid claim could not be settled'; end if;
  if public.finish_line_outbox(
    '10000000-0000-0000-0000-000000000001', current_setting('test.claim_id')::uuid,
    current_setting('test.claim_token')::uuid,
    'sent', null, null
  ) then raise exception 'claim was settled twice'; end if;
end $$;
reset role;

do $$
begin
  if (select quota_used from public.line_channels
      where provider_id = '10000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'sent row and quota were not settled together';
  end if;
end $$;

insert into public.message_outbox(
  provider_id, recipient_id, message_id, body, dedupe_key, first_attempt_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '11100000-0000-0000-0000-000000000001',
  'expired-retry', 'ambiguous delivery', 'expired-retry',
  now() - interval '24 hours'
);
set role service_role;
do $$
begin
  if exists (select 1 from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20
  )) then raise exception 'expired retry key was claimed'; end if;
  if (select status from public.message_outbox where dedupe_key = 'expired-retry') <> 'manual_review' then
    raise exception 'expired retry key did not fail closed to manual review';
  end if;
end $$;
reset role;

update public.line_channels set quota_month = (current_date - interval '1 month')::date,
  quota_used = 299, quota_reserved = 1
where provider_id = '10000000-0000-0000-0000-000000000001';
insert into public.message_outbox(
  provider_id, recipient_id, message_id, body, dedupe_key, status,
  first_attempt_at, quota_month, claimed_at, claim_token
) values (
  '10000000-0000-0000-0000-000000000001',
  '11100000-0000-0000-0000-000000000001',
  'month-boundary', 'month boundary', 'month-boundary', 'processing', now(),
  (current_date - interval '1 month')::date, now(),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
);
set role service_role;
do $$
declare v_month date := date_trunc('month', now() at time zone 'Asia/Bangkok')::date;
begin
  perform * from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 1, false
  );
  if (select quota_month from public.line_channels
      where provider_id = '10000000-0000-0000-0000-000000000001') <> v_month
     or (select quota_used from public.line_channels
      where provider_id = '10000000-0000-0000-0000-000000000001') <> 0
     or (select quota_reserved from public.line_channels
      where provider_id = '10000000-0000-0000-0000-000000000001') <> 1 then
    raise exception 'monthly rollover did not preserve in-flight reservation';
  end if;
  if not public.finish_line_outbox(
    '10000000-0000-0000-0000-000000000001',
    (select id from public.message_outbox where dedupe_key = 'month-boundary'),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'sent', null, null
  ) then raise exception 'month-boundary claim could not finish'; end if;
  if (select quota_used <> 1 or quota_reserved <> 0 from public.line_channels
      where provider_id = '10000000-0000-0000-0000-000000000001') then
    raise exception 'month-boundary delivery counted in wrong month';
  end if;
end $$;
reset role;

update public.line_channels set quota_used = 280, quota_reserved = 0
where provider_id = '10000000-0000-0000-0000-000000000001';
insert into public.message_outbox(provider_id, recipient_id, message_id, body, dedupe_key)
values ('10000000-0000-0000-0000-000000000001',
  '11100000-0000-0000-0000-000000000001', 'auto-paused', 'keep queued', 'auto-paused');
set role service_role;
do $$
begin
  if exists (select 1 from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20, true
  )) then raise exception 'automatic worker claimed above auto ceiling'; end if;
  if (select status from public.message_outbox where dedupe_key = 'auto-paused') <> 'queued' then
    raise exception 'automatic quota pause discarded the queued message';
  end if;
  if not exists (select 1 from public.claim_line_outbox(
    '10000000-0000-0000-0000-000000000001', 20, false
  )) then raise exception 'manual worker could not claim above auto ceiling'; end if;
end $$;
reset role;
