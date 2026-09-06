-- LINE OA ของครูแต่ละคน — ตามแผน docs/line-oa-plan.md ข้อ 3
-- ยังไม่ deploy: รอเงื่อนไขข้อ 0 (ครูจ่ายจริง 5 คน + Supabase ขึ้น + พิสูจน์ว่าการกดส่งเองเป็นปัญหา)

create table if not exists line_channels (
  provider_id      uuid primary key references providers(id) on delete cascade,
  bot_user_id      text unique not null,          -- ใช้ route webhook (destination)
  channel_secret   text not null,                 -- เข้ารหัสก่อนเก็บ ห้าม select จาก client
  access_token     text not null,                 -- เข้ารหัสก่อนเก็บ ห้าม select จาก client
  display_name     text,
  status           text not null default 'active' check (status in ('active','invalid','disabled')),
  quota_used       int  not null default 0,
  quota_limit      int  not null default 300,
  last_verified_at timestamptz,
  created_at       timestamptz not null default now()
);

create table if not exists line_recipients (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references providers(id) on delete cascade,
  client_id     uuid references clients(id) on delete set null,   -- null = ยังไม่จับคู่
  line_user_id  text not null,
  display_name  text,
  linked_at     timestamptz,
  unfollowed_at timestamptz,                                      -- ไม่ลบแถว เก็บกันส่งซ้ำ
  unique (provider_id, line_user_id)
);

create table if not exists line_link_codes (
  code        text primary key,
  provider_id uuid not null references providers(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  expires_at  timestamptz not null,
  used_at     timestamptz
);

-- outbox: ทุกเส้นทางส่งผ่านที่นี่ ห้ามยิง LINE จาก UI ตรง ๆ
create table if not exists message_outbox (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references providers(id) on delete cascade,
  recipient_id  uuid not null references line_recipients(id) on delete cascade,
  message_id    text not null,
  body          text not null,
  dedupe_key    text not null,                    -- key เดิมจาก core/messages.ts ห้ามสร้างใหม่
  status        text not null default 'queued' check (status in ('queued','sent','failed','skipped')),
  attempts      int  not null default 0,
  error         text,
  scheduled_at  timestamptz not null default now(),
  sent_at       timestamptz,
  unique (provider_id, dedupe_key)                -- กันส่งซ้ำที่ระดับฐานข้อมูล
);

alter table line_channels    enable row level security;
alter table line_recipients  enable row level security;
alter table line_link_codes  enable row level security;
alter table message_outbox   enable row level security;

-- ครูเห็นเฉพาะแถวของตัวเอง · ความลับของ channel ไม่มี policy ให้ client อ่านเลย
create policy own_recipients on line_recipients for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy own_codes      on line_link_codes for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());
create policy own_outbox     on message_outbox  for all using (provider_id = auth.uid()) with check (provider_id = auth.uid());

-- frontend อ่าน view นี้เท่านั้น — ไม่มี channel_secret และ access_token อยู่ในนั้น
create or replace view line_channel_public
  with (security_invoker = true) as
  select provider_id, bot_user_id, display_name, status, quota_used, quota_limit, last_verified_at
  from line_channels
  where provider_id = auth.uid();
