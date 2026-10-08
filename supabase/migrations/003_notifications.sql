-- Résonance — migration 003 (08/10/2026) : notifications sur l'appareil (Web Push).
-- Un abonnement = un appareil (iPad avec Résonance sur l'écran d'accueil) relié au compte connecté.
-- Aucune donnée personnelle : l'adresse d'envoi est technique, fournie par Apple / Google / Mozilla.
-- À coller une fois dans Supabase : SQL Editor → New query → Run.

create table if not exists public.abonnements_push (
  endpoint text primary key,
  compte   uuid not null default auth.uid() references public.profils on delete cascade,
  p256dh   text not null,
  auth     text not null,
  cree_le  timestamptz not null default now()
);
alter table public.abonnements_push enable row level security;
drop policy if exists "abonnement : voit les siens" on public.abonnements_push;
create policy "abonnement : voit les siens" on public.abonnements_push for select using (compte = auth.uid());
drop policy if exists "abonnement : retire les siens" on public.abonnements_push;
create policy "abonnement : retire les siens" on public.abonnements_push for delete using (compte = auth.uid());

-- Une tablette peut changer de main : l'appareil est rattaché au dernier compte qui s'y est connecté.
create or replace function public.enregistrer_abonnement(p_endpoint text, p_p256dh text, p_auth text)
returns void language sql security definer set search_path = public as $$
  insert into abonnements_push (endpoint, compte, p256dh, auth)
  select p_endpoint, auth.uid(), p_p256dh, p_auth where auth.uid() is not null
  on conflict (endpoint) do update set compte = excluded.compte, p256dh = excluded.p256dh,
                                       auth = excluded.auth, cree_le = now()
$$;
revoke all on function public.enregistrer_abonnement(text, text, text) from public, anon;
grant execute on function public.enregistrer_abonnement(text, text, text) to authenticated;
