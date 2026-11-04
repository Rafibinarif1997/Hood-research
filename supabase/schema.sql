-- Mohammad Baby Shop: Supabase schema
-- Run this file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '🧸',
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete restrict,
  price numeric(12,2) not null default 0 check (price >= 0),
  old_price numeric(12,2) not null default 0 check (old_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  description text not null default '',
  emoji text not null default '🧸',
  image1 text,
  image2 text,
  image3 text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  phone text not null,
  district text not null,
  upazila text not null,
  address text not null,
  total numeric(12,2) not null check (total >= 0),
  payment_method text not null default 'COD',
  status text not null default 'নতুন অর্ডার',
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  selected_size text not null default '',
  selected_color text not null default ''
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Public storefront can read active products and categories.
drop policy if exists "Public can read categories" on public.categories;
create policy "Public can read categories" on public.categories
for select to anon, authenticated using (true);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products
for select to anon, authenticated using (active = true);

-- Admin is the authenticated account with this exact email.
-- Create this user under Authentication > Users, then sign in through the site.
drop policy if exists "Admin manages categories" on public.categories;
create policy "Admin manages categories" on public.categories
for all to authenticated
using ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');

drop policy if exists "Admin manages products" on public.products;
create policy "Admin manages products" on public.products
for all to authenticated
using ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');

drop policy if exists "Admin reads and manages orders" on public.orders;
create policy "Admin reads and manages orders" on public.orders
for all to authenticated
using ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');

drop policy if exists "Admin reads order items" on public.order_items;
create policy "Admin reads order items" on public.order_items
for all to authenticated
using ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com')
with check ((auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');

-- Customers may place COD orders without an account.
drop policy if exists "Customers can create orders" on public.orders;
create policy "Customers can create orders" on public.orders
for insert to anon, authenticated
with check (status = 'নতুন অর্ডার' and payment_method = 'COD');

drop policy if exists "Customers can add order items" on public.order_items;
create policy "Customers can add order items" on public.order_items
for insert to anon, authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.status = 'নতুন অর্ডার'
      and o.payment_method = 'COD'
  )
);

-- Safe order tracking: only returns status for matching order code + phone.
create or replace function public.track_order(p_order_code text, p_phone text)
returns table(order_code text, status text, created_at timestamptz, total numeric)
language sql
security definer
set search_path = public
as $$
  select o.order_code, o.status, o.created_at, o.total
  from public.orders o
  where o.order_code = p_order_code
    and o.phone = p_phone
  limit 1;
$$;
revoke all on function public.track_order(text,text) from public;
grant execute on function public.track_order(text,text) to anon, authenticated;

grant select on public.categories, public.products to anon, authenticated;
grant insert on public.orders, public.order_items to anon, authenticated;
grant all on public.categories, public.products, public.orders, public.order_items to authenticated;

-- Storage: create a public bucket named product-images in Storage UI.
-- Then apply the storage policies below (admin uploads only).
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admin uploads product images" on storage.objects;
create policy "Admin uploads product images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com'
);

drop policy if exists "Admin updates product images" on storage.objects;
create policy "Admin updates product images" on storage.objects
for update to authenticated
using (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com')
with check (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');

drop policy if exists "Admin deletes product images" on storage.objects;
create policy "Admin deletes product images" on storage.objects
for delete to authenticated
using (bucket_id = 'product-images' and (auth.jwt() ->> 'email') = 'rafibinarif1997@gmail.com');
