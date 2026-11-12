-- LabTrack: Laboratory Inventory & Borrowing Management System
-- Jalankan seluruh skrip ini di Supabase SQL Editor untuk membuat tabel, indeks, fungsi transaksi atomik, dan data awal.

create extension if not exists pgcrypto;

create sequence if not exists public.borrowing_code_seq start 1;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  category text not null,
  total_stock integer not null check (total_stock >= 0),
  available_stock integer not null check (available_stock >= 0 and available_stock <= total_stock),
  location text not null default 'Lab Komputer Utama',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.borrowings (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  borrower_name text not null,
  item_id uuid references public.items(id) on delete set null,
  item_code_snapshot text not null,
  item_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  borrow_date date not null,
  return_date date null,
  status text not null default 'dipinjam' check (status in ('dipinjam', 'selesai')),
  notes text not null default '',
  return_notes text not null default '',
  recorded_by_id uuid references public.users(id) on delete set null,
  recorded_by_name text not null,
  returned_by_id uuid references public.users(id) on delete set null,
  returned_by_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_name text not null,
  actor_role text not null check (actor_role in ('admin', 'staff')),
  action_type text not null,
  target_label text not null,
  summary text not null,
  scope text not null default 'operational' check (scope in ('operational', 'admin_only')),
  created_at timestamptz not null default now()
);

create index if not exists idx_items_code on public.items(code);
create index if not exists idx_items_category on public.items(category);
create index if not exists idx_borrowings_status on public.borrowings(status);
create index if not exists idx_borrowings_created_at on public.borrowings(created_at desc);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- Aktifkan RLS agar akses browser memakai anon key tidak dapat membaca tabel users/password_hash.
-- Server Next.js menggunakan SUPABASE_SERVICE_ROLE_KEY yang melewati RLS secara aman di server.
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.borrowings enable row level security;
alter table public.activity_logs enable row level security;

-- Transaksi peminjaman atomik untuk mencegah race condition stok negatif
create or replace function public.create_borrowing_tx(
  p_borrower_name text,
  p_item_id uuid,
  p_quantity integer,
  p_borrow_date date,
  p_notes text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.items%rowtype;
  v_trx_code text;
  v_borrowing public.borrowings%rowtype;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Jumlah barang harus minimal 1 unit.';
  end if;

  select * into v_item
  from public.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Barang tidak ditemukan.';
  end if;

  if v_item.available_stock < p_quantity then
    raise exception 'Stok tersedia hanya % unit.', v_item.available_stock;
  end if;

  update public.items
  set available_stock = available_stock - p_quantity,
      updated_at = now()
  where id = p_item_id;

  v_trx_code := 'PJM-' || lpad(nextval('public.borrowing_code_seq')::text, 4, '0');

  insert into public.borrowings (
    transaction_code,
    borrower_name,
    item_id,
    item_code_snapshot,
    item_name_snapshot,
    quantity,
    borrow_date,
    status,
    notes,
    recorded_by_id,
    recorded_by_name
  ) values (
    v_trx_code,
    trim(p_borrower_name),
    v_item.id,
    v_item.code,
    v_item.name,
    p_quantity,
    p_borrow_date,
    'dipinjam',
    coalesce(trim(p_notes), ''),
    p_actor_id,
    p_actor_name
  )
  returning * into v_borrowing;

  insert into public.activity_logs (
    actor_id,
    actor_name,
    actor_role,
    action_type,
    target_label,
    summary,
    scope
  ) values (
    p_actor_id,
    p_actor_name,
    p_actor_role,
    'borrow_created',
    v_item.code || ' - ' || v_item.name,
    p_actor_name || ' mencatat peminjaman ' || p_quantity || ' unit ' || v_item.name || ' oleh ' || trim(p_borrower_name) || '.',
    'operational'
  );

  return to_jsonb(v_borrowing);
end;
$$;

-- Transaksi pengembalian atomik untuk mengembalikan stok dan mengubah status menjadi selesai
create or replace function public.return_borrowing_tx(
  p_borrowing_id uuid,
  p_return_date date,
  p_return_notes text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_role text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borrowing public.borrowings%rowtype;
  v_updated public.borrowings%rowtype;
begin
  select * into v_borrowing
  from public.borrowings
  where id = p_borrowing_id
  for update;

  if not found then
    raise exception 'Transaksi peminjaman tidak ditemukan.';
  end if;

  if v_borrowing.status = 'selesai' then
    raise exception 'Transaksi ini sudah dikembalikan sebelumnya.';
  end if;

  if v_borrowing.item_id is not null then
    update public.items
    set available_stock = least(total_stock, available_stock + v_borrowing.quantity),
        updated_at = now()
    where id = v_borrowing.item_id;
  end if;

  update public.borrowings
  set status = 'selesai',
      return_date = p_return_date,
      return_notes = coalesce(trim(p_return_notes), ''),
      returned_by_id = p_actor_id,
      returned_by_name = p_actor_name,
      updated_at = now()
  where id = p_borrowing_id
  returning * into v_updated;

  insert into public.activity_logs (
    actor_id,
    actor_name,
    actor_role,
    action_type,
    target_label,
    summary,
    scope
  ) values (
    p_actor_id,
    p_actor_name,
    p_actor_role,
    'borrow_returned',
    v_borrowing.item_code_snapshot || ' - ' || v_borrowing.item_name_snapshot,
    p_actor_name || ' memproses pengembalian ' || v_borrowing.quantity || ' unit ' || v_borrowing.item_name_snapshot || ' dari ' || v_borrowing.borrower_name || '.',
    'operational'
  );

  return to_jsonb(v_updated);
end;
$$;

-- Akun Demo (Admin: admin / admin123, Staff: staff / staff123)
insert into public.users (username, full_name, password_hash, role, is_active)
values
  (
    'admin',
    'Kepala Lab Komputer',
    'scrypt$960dccfa64d059eefb67ee265a7aa171$8c0164b163ab2b1c3b37c0cf67e9e9194711adde21de7621ab896c80d6bc566460fd734ccda0fa9a66cb5f413568afc23b33d8e470f00248eb2e8b81f4b1fce8',
    'admin',
    true
  ),
  (
    'staff',
    'Petugas Lab Operasional',
    'scrypt$201c1fbabacb6b7aae3065cc20016aa3$03174916e44a8c63d05d0a30e2d3703caa0ce5df2d19bc191820b680013430149f109c1904235bbdcb0fd5dc9e8cc99355e6c5fd9671177beed5edc188dceeab',
    'staff',
    true
  )
on conflict (username) do nothing;

-- Data Awal Barang (5 barang wajib + peralatan lab tambahan)
insert into public.items (code, name, category, total_stock, available_stock, location)
values
  ('BR001', 'Laptop Lenovo', 'Laptop', 5, 5, 'Rak Lab A1'),
  ('BR002', 'Mouse Logitech', 'Mouse', 10, 10, 'Laci Periferal B1'),
  ('BR003', 'Keyboard Mechanical', 'Keyboard', 8, 8, 'Laci Periferal B2'),
  ('BR004', 'Proyektor Epson', 'Proyektor', 3, 3, 'Lemari AV C1'),
  ('BR005', 'Monitor LG', 'Monitor', 6, 6, 'Rak Lab A2'),
  ('BR006', 'Router MikroTik RB750Gr3', 'Perangkat Jaringan', 4, 4, 'Rak Jaringan D1'),
  ('BR007', 'Switch TP-Link 8-Port Gigabit', 'Perangkat Jaringan', 6, 6, 'Rak Jaringan D1'),
  ('BR008', 'Access Point Ubiquiti UniFi', 'Perangkat Jaringan', 3, 3, 'Rak Jaringan D2'),
  ('BR009', 'Kabel HDMI 5 Meter', 'Aksesori Lab', 12, 12, 'Lemari AV C2'),
  ('BR010', 'Tang Crimping & LAN Tester', 'Perangkat Jaringan', 7, 7, 'Box Alat Jaringan D3'),
  ('BR011', 'Laptop ASUS VivoBook Lab', 'Laptop', 6, 6, 'Rak Lab A1'),
  ('BR012', 'Monitor Dell 24 Inch', 'Monitor', 4, 4, 'Rak Lab A2')
on conflict (code) do nothing;

