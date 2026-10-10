-- Matek Ambis: RLS ketat tabel lomba + cleanup data (Okt 2026)
-- Jalankan di Supabase SQL Editor sebagai postgres/service_role.

-- 1. Aktifkan RLS
alter table public.lomba enable row level security;

-- 2. Bersihkan policy lama yang terlalu longgar (anon write)
drop policy if exists "Allow all for anon" on public.lomba;
drop policy if exists "Allow insert for anon" on public.lomba;
drop policy if exists "Allow update for anon" on public.lomba;
drop policy if exists "Allow delete for anon" on public.lomba;
drop policy if exists "Public read lomba" on public.lomba;

-- 3. READ publik (select) untuk anon + authenticated
create policy "Public read lomba"
on public.lomba for select
to anon, authenticated
using (true);

-- 4. WRITE hanya service_role (Edge Function backend).
--    Tidak ada policy insert/update/delete untuk anon/authenticated,
--    sehingga write langsung dari browser dengan anonKey selalu ditolak.
--    Edge Function memakai service_role key (bypass RLS).

-- 5. Cleanup data dummy / typo (idempotent)
delete from public.lomba
where judul ilike 'nasi goreng%' or judul = 'Nasi';

update public.lomba
set judul = replace(judul, 'Chalange', 'Challenge')
where judul ilike '%chalange%';

update public.lomba
set judul = replace(judul, 'chalange', 'challenge')
where judul ilike '%chalange%';

-- 6. Deskripsi: tetap simpan TEKS mentah (jangan simpan HTML di DB).
--    Linkify + escape dilakukan saat render di frontend (js/app.js: linkifySafe)
--    untuk mencegah XSS. Tidak ada migrasi HTML ke kolom deskripsi.

-- 7. (Opsional) Storage poster: buat bucket privat + policy read publik
-- insert into storage.buckets (id, name, public)
-- values ('poster-lomba', 'poster-lomba', true)
-- on conflict (id) do nothing;
