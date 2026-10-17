-- Résonance — migration 005 (17/10/2026) : progression du parcours Python (rubrique Outils).
-- Uniquement des ajouts : aucune table existante n'est modifiée. Suppose la migration 004 déjà collée
-- (table classes_participation).
-- Ce qui est enregistré : « tel compte a réussi tel exercice de tel niveau, à telle date ».
-- Jamais le code tapé par l'élève (du texte libre peut contenir n'importe quoi), jamais de nom.
-- La réussite est constatée dans le navigateur de l'élève : c'est un repère de travail, pas une note.
-- À coller une fois dans Supabase : SQL Editor → New query → Run. Peut être relancée sans dommage.

create table if not exists public.python_reussites (
  eleve     uuid not null default auth.uid() references public.profils on delete cascade,
  niveau    smallint not null check (niveau between 1 and 5),
  exercice  text not null check (exercice ~ '^[a-z0-9][a-z0-9-]{0,39}$'),  -- id HTML de l'exercice, ex. « ex-2-3 »
  reussi_le timestamptz not null default now(),
  primary key (eleve, niveau, exercice)
);
alter table public.python_reussites enable row level security;

-- Classes d'un enseignant : celles de son compte (profils.classes, posées par preparer_supabase.py --classes)
-- et celles où il a ouvert la Participation. Lu sans passer par les règles de profils.
create or replace function public.mes_classes_prof() returns setof text
language sql stable security definer set search_path = public as $$
  select unnest(p.classes) from profils p where p.id = auth.uid() and p.role = 'prof'
  union
  select c.classe from classes_participation c where c.prof = auth.uid()
$$;
revoke all on function public.mes_classes_prof() from public, anon;
grant execute on function public.mes_classes_prof() to authenticated;

-- L'élève enregistre et relit les siennes. Pas de modification ni d'effacement côté élève :
-- une réussite déjà enregistrée est ignorée (insert … on conflict do nothing depuis la page).
drop policy if exists "python : élève enregistre les siennes" on public.python_reussites;
create policy "python : élève enregistre les siennes" on public.python_reussites for insert
  with check (public.est_eleve() and eleve = auth.uid());
drop policy if exists "python : élève voit les siennes" on public.python_reussites;
create policy "python : élève voit les siennes" on public.python_reussites for select
  using (eleve = auth.uid());

-- L'enseignant lit celles des élèves de ses classes, et seulement celles-là.
drop policy if exists "python : prof voit ses classes" on public.python_reussites;
create policy "python : prof voit ses classes" on public.python_reussites for select
  using (public.est_prof() and exists (
    select 1 from public.profils p
    where p.id = python_reussites.eleve and p.classe in (select public.mes_classes_prof())));

-- Fin d'année (avec le reste des données, fin août) :  delete from public.python_reussites;
