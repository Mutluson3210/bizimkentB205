-- Duyuru bildirimleri için push abonelikleri.
--
-- Her satır BİR TARAYICI/CİHAZ demektir, bir kişi değil: aynı sakin hem
-- telefonundan hem tabletinden abone olabilir. endpoint tarayıcının ürettiği
-- benzersiz adres; aynı cihaz yeniden abone olursa üzerine yazılır.
--
-- RLS: projedeki account_views deseni birebir izleniyor — sakine yalnız
-- SELECT veriliyor, yazmalar servis rolüyle ve hesap oturumdan çözülerek
-- yapılıyor (istemci hangi hesaba yazılacağını söyleyemez).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_secret text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index if not exists push_subscriptions_account_id_idx
  on public.push_subscriptions (account_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;

create policy push_subscriptions_select_own
  on public.push_subscriptions
  for select
  using (
    exists (
      select 1
      from public.accounts a
      where a.id = push_subscriptions.account_id
        and a.auth_user_id = auth.uid()
        and a.is_active
    )
  );
