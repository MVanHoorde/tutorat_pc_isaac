-- Résonance — migration 004 (11/10/2026) : participation orale et dépôt de ressources (points bonus).
-- Uniquement des ajouts : aucune table du tutorat n'est modifiée.
-- Aucun nom d'élève ici. Les listes de noms et les relevés ne circulent que chiffrés
-- (« boites ») : le serveur les transmet sans pouvoir les lire.
-- À coller une fois dans Supabase : SQL Editor → New query → Run.

-- Classe du compte connecté (élève), lue sans passer par les règles de profils.
create or replace function public.ma_classe() returns text
language sql stable security definer set search_path = public as $$
  select classe from profils where id = auth.uid()
$$;
revoke all on function public.ma_classe() from public, anon;
grant execute on function public.ma_classe() to authenticated;

-- ---------------------------------------------------------------------------
-- Classes où les onglets Participation et Dépôts sont ouverts, et leur professeur.
-- ---------------------------------------------------------------------------
create table if not exists public.classes_participation (
  classe  text primary key,
  prof    uuid not null default auth.uid() references public.profils on delete cascade,
  cree_le timestamptz not null default now()
);
alter table public.classes_participation enable row level security;
drop policy if exists "classe part. : prof gère les siennes" on public.classes_participation;
create policy "classe part. : prof gère les siennes" on public.classes_participation for all
  using (public.est_prof() and prof = auth.uid()) with check (public.est_prof() and prof = auth.uid());
drop policy if exists "classe part. : prof voit tout" on public.classes_participation;
create policy "classe part. : prof voit tout" on public.classes_participation for select using (public.est_prof());
drop policy if exists "classe part. : élève voit la sienne" on public.classes_participation;
create policy "classe part. : élève voit la sienne" on public.classes_participation for select
  using (classe = public.ma_classe());

-- ---------------------------------------------------------------------------
-- Clés publiques de chiffrement : une par appareil (Safari et l'icône de l'écran
-- d'accueil comptent pour deux). La clé privée ne quitte jamais l'appareil.
-- ---------------------------------------------------------------------------
create table if not exists public.cles_publiques (
  compte    uuid not null default auth.uid() references public.profils on delete cascade,
  empreinte text not null,
  cle       jsonb not null,            -- clé publique ECDH P-256 au format JWK (kty, crv, x, y)
  maj_le    timestamptz not null default now(),
  primary key (compte, empreinte)
);
alter table public.cles_publiques enable row level security;
drop policy if exists "clé : chacun dépose les siennes" on public.cles_publiques;
create policy "clé : chacun dépose les siennes" on public.cles_publiques for all
  using (compte = auth.uid()) with check (compte = auth.uid());
drop policy if exists "clé : prof voit tout" on public.cles_publiques;
create policy "clé : prof voit tout" on public.cles_publiques for select using (public.est_prof());
drop policy if exists "clé : élève voit celles de son professeur" on public.cles_publiques;
create policy "clé : élève voit celles de son professeur" on public.cles_publiques for select
  using (compte in (select prof from public.classes_participation where classe = public.ma_classe()));

-- ---------------------------------------------------------------------------
-- Observateurs désignés : un poste (A ou B) d'une séance, confié à un élève.
-- « boites » : la séance (liste des noms comprise) chiffrée pour chaque appareil de l'élève.
-- ---------------------------------------------------------------------------
create table if not exists public.obs_affectations (
  id          bigint generated always as identity primary key,
  jeton       text not null unique,     -- jeton du poste, celui du QR de séance
  prof        uuid not null default auth.uid() references public.profils on delete cascade,
  observateur uuid not null references public.profils on delete cascade,
  poste       text not null check (poste in ('A', 'B')),
  jour        date not null default current_date,
  boites      jsonb not null default '{}',
  cree_le     timestamptz not null default now()
);
alter table public.obs_affectations enable row level security;
drop policy if exists "affectation : prof gère les siennes" on public.obs_affectations;
create policy "affectation : prof gère les siennes" on public.obs_affectations for all
  using (public.est_prof() and prof = auth.uid()) with check (public.est_prof() and prof = auth.uid());
drop policy if exists "affectation : observateur voit la sienne" on public.obs_affectations;
create policy "affectation : observateur voit la sienne" on public.obs_affectations for select
  using (observateur = auth.uid());

-- ---------------------------------------------------------------------------
-- Relevés envoyés par les observateurs, chiffrés pour les appareils du professeur.
-- Effacés avec l'affectation, quand le professeur valide ou annule la séance.
-- ---------------------------------------------------------------------------
create table if not exists public.obs_releves (
  affectation_id bigint primary key references public.obs_affectations on delete cascade,
  auteur         uuid not null default auth.uid() references public.profils on delete cascade,
  boites         jsonb not null,
  envoye_le      timestamptz not null default now(),
  recu_le        timestamptz
);
alter table public.obs_releves enable row level security;
drop policy if exists "relevé : observateur dépose le sien" on public.obs_releves;
create policy "relevé : observateur dépose le sien" on public.obs_releves for insert
  with check (auteur = auth.uid() and exists (
    select 1 from public.obs_affectations a where a.id = affectation_id and a.observateur = auth.uid()));
drop policy if exists "relevé : observateur le renvoie" on public.obs_releves;
create policy "relevé : observateur le renvoie" on public.obs_releves for update
  using (auteur = auth.uid()) with check (auteur = auth.uid());
drop policy if exists "relevé : observateur voit le sien" on public.obs_releves;
create policy "relevé : observateur voit le sien" on public.obs_releves for select using (auteur = auth.uid());
drop policy if exists "relevé : prof gère ceux de ses séances" on public.obs_releves;
create policy "relevé : prof gère ceux de ses séances" on public.obs_releves for all
  using (exists (select 1 from public.obs_affectations a where a.id = affectation_id and a.prof = auth.uid()))
  with check (exists (select 1 from public.obs_affectations a where a.id = affectation_id and a.prof = auth.uid()));

-- ---------------------------------------------------------------------------
-- Où en est chaque élève : publié par le professeur après chaque séance validée.
-- Chaque élève ne voit que sa ligne : pas de classement possible.
-- ---------------------------------------------------------------------------
create table if not exists public.participation_suivi (
  eleve     uuid primary key references public.profils on delete cascade,
  points    integer not null default 0,
  objectif  integer not null default 0,
  seances   integer not null default 0,
  presences integer not null default 0,
  roles     integer not null default 0,
  bilan     text not null default '',
  maj_le    timestamptz not null default now()
);
alter table public.participation_suivi enable row level security;
drop policy if exists "suivi : prof gère" on public.participation_suivi;
create policy "suivi : prof gère" on public.participation_suivi for all
  using (public.est_prof()) with check (public.est_prof());
drop policy if exists "suivi : élève voit le sien" on public.participation_suivi;
create policy "suivi : élève voit le sien" on public.participation_suivi for select using (eleve = auth.uid());

-- ---------------------------------------------------------------------------
-- Dépôts de ressources : validés par le professeur avant d'être montrés à la classe.
-- ---------------------------------------------------------------------------
create table if not exists public.depots (
  id           bigint generated always as identity primary key,
  auteur       uuid not null default auth.uid() references public.profils on delete cascade,
  classe       text not null default public.ma_classe(),
  titre        text not null check (char_length(titre) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 600),
  lien         text check (lien is null or lien ~* '^https?://'),
  fichier      text,                    -- chemin dans le stockage « depots »
  fichier_nom  text,
  statut       text not null default 'en_attente' check (statut in ('en_attente', 'valide', 'refuse')),
  points_bonus numeric(4,1) not null default 0 check (points_bonus between 0 and 20),
  commentaire  text not null default '' check (char_length(commentaire) <= 400),
  cree_le      timestamptz not null default now(),
  valide_le    timestamptz,
  check (lien is not null or fichier is not null)
);
alter table public.depots enable row level security;
drop policy if exists "dépôt : élève dépose" on public.depots;
create policy "dépôt : élève dépose" on public.depots for insert
  with check (auteur = auth.uid() and public.est_eleve() and classe = public.ma_classe()
              and statut = 'en_attente' and points_bonus = 0 and commentaire = '' and valide_le is null
              and classe in (select classe from public.classes_participation));
drop policy if exists "dépôt : élève voit les siens" on public.depots;
create policy "dépôt : élève voit les siens" on public.depots for select using (auteur = auth.uid());
drop policy if exists "dépôt : la classe voit les validés" on public.depots;
create policy "dépôt : la classe voit les validés" on public.depots for select
  using (statut = 'valide' and classe = public.ma_classe());
drop policy if exists "dépôt : élève retire le sien en attente" on public.depots;
create policy "dépôt : élève retire le sien en attente" on public.depots for delete
  using (auteur = auth.uid() and statut = 'en_attente');
drop policy if exists "dépôt : prof gère" on public.depots;
create policy "dépôt : prof gère" on public.depots for all using (public.est_prof()) with check (public.est_prof());

-- La classe voit les ressources validées, jamais qui les a déposées.
create or replace view public.ressources_classe with (security_invoker = true) as
  select id, classe, titre, description, lien, fichier, fichier_nom, valide_le
  from public.depots where statut = 'valide';

-- ---------------------------------------------------------------------------
-- Stockage des fichiers déposés : privé, 10 Mo au plus, PDF, images et documents bureautiques.
-- Chemin : <compte de l'auteur>/<horodatage>-<nom>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('depots', 'depots', false, 10485760, array[
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.presentation'])
on conflict (id) do nothing;

drop policy if exists "fichier dépôt : élève envoie dans son dossier" on storage.objects;
create policy "fichier dépôt : élève envoie dans son dossier" on storage.objects for insert to authenticated
  with check (bucket_id = 'depots' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fichier dépôt : lecture" on storage.objects;
create policy "fichier dépôt : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'depots' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.est_prof()
    or exists (select 1 from public.depots d
               where d.fichier = storage.objects.name and d.statut = 'valide' and d.classe = public.ma_classe())));
drop policy if exists "fichier dépôt : suppression" on storage.objects;
create policy "fichier dépôt : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'depots' and ((storage.foldername(name))[1] = auth.uid()::text or public.est_prof()));
