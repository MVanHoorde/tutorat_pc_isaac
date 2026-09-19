-- Résonance — structure de la base Supabase
-- À coller une fois dans Supabase : SQL Editor → New query → Run.
-- Aucun nom d'élève n'est stocké ici : seulement des identifiants (PC-XXXXX, PR-XXXXX).

-- ---------------------------------------------------------------------------
-- Rôle de l'utilisateur connecté, lu dans son jeton (app_metadata, non modifiable par lui)
-- ---------------------------------------------------------------------------
create or replace function public.mon_role() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
$$;

create or replace function public.est_prof() returns boolean
language sql stable as $$ select public.mon_role() = 'prof' $$;

create or replace function public.est_eleve() returns boolean
language sql stable as $$ select public.mon_role() = 'eleve' $$;

-- ---------------------------------------------------------------------------
-- Comptes en attente de première connexion (issus de generer_identifiants.py).
-- Lus uniquement par la fonction premiere-connexion : aucune règle d'accès = personne d'autre.
-- ---------------------------------------------------------------------------
create table if not exists public.comptes_import (
  identifiant text primary key,
  role        text not null check (role in ('eleve', 'prof')),
  classe      text,
  classes     text[] not null default '{}',
  empreinte   text not null,
  importe_le  timestamptz not null default now()
);
alter table public.comptes_import enable row level security;

-- ---------------------------------------------------------------------------
-- Profils : un par compte activé
-- ---------------------------------------------------------------------------
create table if not exists public.profils (
  id          uuid primary key references auth.users on delete cascade,
  identifiant text not null unique,
  role        text not null check (role in ('eleve', 'prof')),
  classe      text,                       -- élève : sa classe
  classes     text[] not null default '{}', -- prof : ses classes
  cree_le     timestamptz not null default now()
);
alter table public.profils enable row level security;
create policy "profil : le sien" on public.profils for select using (id = auth.uid());
create policy "profil : prof voit tout" on public.profils for select using (public.est_prof());

-- ---------------------------------------------------------------------------
-- Demandes d'aide
-- ---------------------------------------------------------------------------
create table if not exists public.demandes (
  id         bigint generated always as identity primary key,
  auteur     uuid not null default auth.uid() references public.profils on delete cascade,
  niveau     smallint not null check (niveau in (0, 1)), -- 1 = première, 0 = terminale
  chapitre   text not null,
  natures    text[] not null default '{}',
  besoin     text not null check (besoin in ('ponctuel', 'duree')),
  duree      text not null check (duree in ('min', 'heure')),
  urgent     boolean not null default false,
  date_eval  date,
  texte      varchar(400),
  creneaux   text[] not null default '{}',
  statut     text not null default 'ouverte' check (statut in ('ouverte', 'positionnee', 'binome', 'close')),
  cree_le    timestamptz not null default now()
);
alter table public.demandes enable row level security;
create policy "demande : élève dépose la sienne" on public.demandes for insert
  with check (public.est_eleve() and auteur = auth.uid());
create policy "demande : élève voit la sienne" on public.demandes for select using (auteur = auth.uid());
create policy "demande : élève retire la sienne" on public.demandes for delete using (auteur = auth.uid());
create policy "demande : prof voit tout" on public.demandes for select using (public.est_prof());
create policy "demande : prof modifie" on public.demandes for update using (public.est_prof());

-- ---------------------------------------------------------------------------
-- Disponibilités des tuteurs
-- ---------------------------------------------------------------------------
create table if not exists public.disponibilites (
  eleve    uuid primary key default auth.uid() references public.profils on delete cascade,
  creneaux text[] not null default '{}',
  maj_le   timestamptz not null default now()
);
alter table public.disponibilites enable row level security;
create policy "dispo : élève gère les siennes" on public.disponibilites for all
  using (eleve = auth.uid()) with check (public.est_eleve() and eleve = auth.uid());
create policy "dispo : prof voit tout" on public.disponibilites for select using (public.est_prof());

-- ---------------------------------------------------------------------------
-- Positionnements : un tuteur se propose sur une demande
-- ---------------------------------------------------------------------------
create table if not exists public.positionnements (
  demande_id bigint not null references public.demandes on delete cascade,
  tuteur     uuid not null default auth.uid() references public.profils on delete cascade,
  creneaux   text[] not null default '{}',  -- créneaux de la demande qui conviennent au tuteur (migration 002)
  cree_le    timestamptz not null default now(),
  primary key (demande_id, tuteur)
);
alter table public.positionnements enable row level security;
create policy "positionnement : élève se positionne" on public.positionnements for insert
  with check (public.est_eleve() and tuteur = auth.uid()
              and not exists (select 1 from public.demandes d where d.id = demande_id and d.auteur = auth.uid()));
create policy "positionnement : élève voit les siens" on public.positionnements for select using (tuteur = auth.uid());
create policy "positionnement : élève se retire" on public.positionnements for delete using (tuteur = auth.uid());
create policy "positionnement : prof voit tout" on public.positionnements for select using (public.est_prof());

create or replace function public.apres_positionnement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update demandes set statut = 'positionnee' where id = new.demande_id and statut = 'ouverte';
  return new;
end $$;
drop trigger if exists positionnement_statut on public.positionnements;
create trigger positionnement_statut after insert on public.positionnements
  for each row execute function public.apres_positionnement();

-- Ce que voient les tuteurs : les demandes ouvertes des autres, SANS auteur ni classe.
create or replace function public.demandes_ouvertes()
returns table (id bigint, niveau smallint, chapitre text, natures text[], besoin text, duree text,
               urgent boolean, date_eval date, texte varchar, creneaux text[], statut text, deja_positionne boolean)
language sql stable security definer set search_path = public as $$
  select d.id, d.niveau, d.chapitre, d.natures, d.besoin, d.duree, d.urgent, d.date_eval, d.texte, d.creneaux,
         d.statut,
         exists (select 1 from positionnements p where p.demande_id = d.id and p.tuteur = auth.uid())
  from demandes d
  where auth.uid() is not null
    and d.statut in ('ouverte', 'positionnee')
    and d.auteur <> auth.uid()
  order by d.urgent desc, d.cree_le
$$;
revoke all on function public.demandes_ouvertes() from public, anon;
grant execute on function public.demandes_ouvertes() to authenticated;

-- ---------------------------------------------------------------------------
-- Séances (binômes validés par un professeur), bilans, retours
-- ---------------------------------------------------------------------------
create table if not exists public.seances (
  id         bigint generated always as identity primary key,
  demande_id bigint references public.demandes on delete set null,
  tuteur     uuid not null references public.profils on delete cascade,
  tutores    uuid[] not null,
  chapitre   text not null,
  creneau    text not null,        -- ex. « s-3 » : séance du jeudi
  jour       date not null,
  valide_par uuid not null default auth.uid() references public.profils,
  cree_le    timestamptz not null default now()
);
alter table public.seances enable row level security;
create policy "séance : prof gère" on public.seances for all using (public.est_prof()) with check (public.est_prof());
create policy "séance : participants la voient" on public.seances for select
  using (tuteur = auth.uid() or auth.uid() = any (tutores));

create table if not exists public.bilans (
  seance_id  bigint primary key references public.seances on delete cascade,
  tuteur     uuid not null default auth.uid() references public.profils,
  presents   uuid[] not null default '{}',
  duree      text,
  deroulement text check (deroulement in ('bien', 'partie', 'difficile')),
  coches     text[] not null default '{}',
  texte      text,
  audio_path text,                 -- fichier dans le stockage Supabase (étape ultérieure)
  cree_le    timestamptz not null default now()
);
alter table public.bilans enable row level security;
create policy "bilan : tuteur dépose le sien" on public.bilans for insert
  with check (tuteur = auth.uid() and exists (select 1 from public.seances s where s.id = seance_id and s.tuteur = auth.uid()));
create policy "bilan : tuteur voit le sien" on public.bilans for select using (tuteur = auth.uid());
create policy "bilan : prof voit tout" on public.bilans for select using (public.est_prof());

create table if not exists public.retours (
  seance_id bigint not null references public.seances on delete cascade,
  eleve     uuid not null default auth.uid() references public.profils,
  aide      text check (aide in ('oui', 'partie', 'non')),
  coches    text[] not null default '{}',
  mot       varchar(200),
  cree_le   timestamptz not null default now(),
  primary key (seance_id, eleve)
);
alter table public.retours enable row level security;
-- Le tuteur n'a AUCUN accès aux retours qui le concernent.
create policy "retour : tutoré dépose le sien" on public.retours for insert
  with check (eleve = auth.uid() and exists (select 1 from public.seances s where s.id = seance_id and auth.uid() = any (s.tutores)));
create policy "retour : tutoré voit le sien" on public.retours for select using (eleve = auth.uid());
create policy "retour : prof voit tout" on public.retours for select using (public.est_prof());
