-- IGH Tour — Supabase schema
-- Jalankan sekali di SQL Editor Supabase Dashboard untuk inisialisasi.
-- v1: open-policy (anon key full access). Tambahin Auth + RLS policies di iterasi berikutnya.

-- ── TABLES ──────────────────────────────────────────────────────────────────

create table if not exists public.trips (
  id            text primary key,
  name          text not null,
  destination   text not null default '',
  start_date    text not null default '',
  end_date      text not null default '',
  emoji         text not null default '✈️',
  cover_image   text,
  created_at    timestamptz not null default now()
);

create table if not exists public.jamaah (
  id              text primary key,
  trip_id         text not null references public.trips(id) on delete cascade,
  name            text not null,
  phone           text not null default '',
  birth_date      text not null default '',
  passport_number text not null default '',
  gender          text not null default '',
  photo_data_url  text,
  needs_review    boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists jamaah_trip_idx on public.jamaah (trip_id);
-- Idempotent column add (untuk DB lama)
alter table public.jamaah add column if not exists needs_review boolean not null default false;

create table if not exists public.jamaah_docs (
  id          text primary key,
  jamaah_id   text not null references public.jamaah(id) on delete cascade,
  category    text not null,
  label       text not null default '',
  file_name   text not null default '',
  file_type   text not null default 'image',
  data_url    text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists jamaah_docs_jamaah_idx on public.jamaah_docs (jamaah_id);

create table if not exists public.packages (
  id              text primary key,
  name            text not null,
  destination     text not null default '',
  people          int  not null default 1,
  days            int  not null default 1,
  hpp             numeric not null default 0,
  total_idr       numeric not null default 0,
  status          text not null default 'Draft',
  emoji           text not null default '📦',
  cover_image     text,
  departure_date  text,
  airline         text,
  hotel_level     text,
  notes           text,
  facilities      jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.package_calculations (
  package_id  text primary key references public.packages(id) on delete cascade,
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.notes (
  id          text primary key,
  title       text not null default '',
  content     text not null default '',
  color       text not null default 'bg-white border-slate-200',
  pinned      boolean not null default false,
  tags        jsonb,
  created_at  bigint not null,
  updated_at  bigint not null
);

create table if not exists public.pdf_templates (
  id          text primary key,
  name        text not null,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

-- ── OPEN POLICIES (v1) ──────────────────────────────────────────────────────
-- ⚠️ Untuk production, AKTIFIN RLS dan ganti policy ini biar cuma authenticated user yg bisa akses.

alter table public.trips                enable row level security;
alter table public.jamaah               enable row level security;
alter table public.jamaah_docs          enable row level security;
alter table public.packages             enable row level security;
alter table public.package_calculations enable row level security;
alter table public.notes                enable row level security;
alter table public.pdf_templates        enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'trips','jamaah','jamaah_docs','packages',
    'package_calculations','notes','pdf_templates'
  ]) loop
    execute format('drop policy if exists "open_all" on public.%I', t);
    execute format('create policy "open_all" on public.%I for all using (true) with check (true)', t);
  end loop;
end$$;

-- ── STORAGE BUCKETS ─────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values
  ('jamaah-photos',  'jamaah-photos',  true),
  ('jamaah-docs',    'jamaah-docs',    true),
  ('pdf-templates',  'pdf-templates',  true)
on conflict (id) do nothing;

drop policy if exists "buckets_open_all" on storage.objects;
create policy "buckets_open_all" on storage.objects
  for all
  using (bucket_id in ('jamaah-photos','jamaah-docs','pdf-templates'))
  with check (bucket_id in ('jamaah-photos','jamaah-docs','pdf-templates'));

-- ── REALTIME PUBLICATION ────────────────────────────────────────────────────
-- Tabel-tabel ini akan emit perubahan via Supabase Realtime ke semua client.
do $$
declare t text;
begin
  for t in select unnest(array[
    'trips','jamaah','jamaah_docs','packages',
    'package_calculations','notes','pdf_templates'
  ]) loop
    -- tambahin ke publication kalau belum ada (idempotent)
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end$$;
