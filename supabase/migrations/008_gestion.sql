-- Résonance — migration 008 (11/11/2026) : la gestion du site entre collègues.
-- Uniquement des ajouts : aucune table existante n'est modifiée. Suppose la migration 005 collée
-- (fonction mes_classes_prof).
-- À coller une fois dans Supabase : SQL Editor → New query → Run. Peut être relancée sans dommage.
--
-- BESOIN (M. Van Hoorde, 11/11/2026)
--   · Des comptes d'élèves en double chez une collègue : chaque enseignant doit pouvoir cocher, dans le
--     Tableau de bord, les comptes de ses classes à supprimer ; le gestionnaire du site (M. Van Hoorde)
--     les retrouve tous au même endroit et les efface d'un bouton.
--   · Chaque enseignant peut masquer de son affichage des élèves (comptes de test, élèves partis…)
--     et des rubriques du Tableau de bord qui ne lui servent pas. Le masquage ne touche que son écran.
--   · Une boîte « Écrire à M. Van Hoorde » sur toutes les vues, au lieu des mots papier dans les casiers.
--   · Une fenêtre « Nouveautés » à la connexion d'un enseignant, une fois par nouveauté : on garde ici
--     le numéro de la dernière nouveauté vue (la liste vit dans nouveautes.js).
--
-- ARBITRAGES
--   · Le gestionnaire est un compte enseignant inscrit dans la table gestionnaires (à la main, ci-dessous).
--     Personne ne lit cette table : est_gestionnaire() répond pour le compte connecté seulement.
--   · Une demande de suppression vise un IDENTIFIANT (PC-…), pas un compte : un coupon jamais utilisé
--     (comptes_import) peut aussi être en double. Un enseignant ne vise que les élèves de SES classes.
--   · L'effacement est réservé au gestionnaire, aux seuls comptes ÉLÈVES : jamais un compte enseignant.
--     Il retire le compte (toutes ses données suivent, par les « on delete cascade »), son coupon s'il
--     traîne encore, et les demandes qui le visaient. Irréversible.
--   · Les messages sont lus par le gestionnaire seul, qui peut répondre ; l'auteur relit les siens et la
--     réponse. Trente messages par enseignant et par jour au plus.
--
-- RGPD
--   Aucun nom d'élève : le formulaire demande l'identifiant (PC-…), jamais le nom ; les demandes de
--   suppression ne portent que l'identifiant et un motif court. Les messages restent entre enseignants.
--   Fin d'année : delete from public.messages_gestion; delete from public.demandes_suppression;

-- ---------------------------------------------------------------------------
-- Gestionnaire du site
-- ---------------------------------------------------------------------------
create table if not exists public.gestionnaires (
  compte    uuid primary key references public.profils on delete cascade,
  ajoute_le timestamptz not null default now()
);
alter table public.gestionnaires enable row level security;   -- aucune règle : personne ne la lit

create or replace function public.est_gestionnaire() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.gestionnaires g
                 join public.profils p on p.id = g.compte and p.role = 'prof'
                 where g.compte = auth.uid())
$$;
revoke all on function public.est_gestionnaire() from public, anon;
grant execute on function public.est_gestionnaire() to authenticated;

-- M. Van Hoorde : le seul compte enseignant rattaché à sa classe de terminale. S'il y en a zéro ou
-- plusieurs, rien n'est fait et un message le dit : l'inscrire alors à la main, avec son identifiant :
--   insert into public.gestionnaires (compte) select id from public.profils where identifiant = 'PR-XXXXX';
do $$
declare n int;
begin
  select count(*) into n from public.profils
   where role = 'prof' and 'B1_T_3_PH-CH_VANHOORDE' = any (classes);
  if n = 1 then
    insert into public.gestionnaires (compte)
      select id from public.profils where role = 'prof' and 'B1_T_3_PH-CH_VANHOORDE' = any (classes)
      on conflict do nothing;
  else
    raise notice 'Gestionnaire non inscrit : % comptes enseignants ont la classe B1_T_3_PH-CH_VANHOORDE. À faire à la main.', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Réglages de chaque enseignant : ce qu'il masque, la dernière nouveauté vue
-- ---------------------------------------------------------------------------
create table if not exists public.reglages_prof (
  prof               uuid primary key default auth.uid() references public.profils on delete cascade,
  comptes_masques    text[] not null default '{}' check (cardinality(comptes_masques) <= 2000),
  rubriques_masquees text[] not null default '{}' check (cardinality(rubriques_masquees) <= 40),
  nouveautes_vues    integer not null default 0 check (nouveautes_vues >= 0),
  maj_le             timestamptz not null default now()
);
alter table public.reglages_prof enable row level security;
drop policy if exists "réglages : enseignant gère les siens" on public.reglages_prof;
create policy "réglages : enseignant gère les siens" on public.reglages_prof for all to authenticated
  using (prof = auth.uid() and public.est_prof())
  with check (prof = auth.uid() and public.est_prof());

-- ---------------------------------------------------------------------------
-- Un identifiant d'élève est-il dans les classes de l'enseignant connecté ? (compte activé ou coupon)
-- ---------------------------------------------------------------------------
create or replace function public.eleve_de_mes_classes(p_identifiant text) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.est_prof() and (
    exists (select 1 from public.profils p
             where p.identifiant = p_identifiant and p.role = 'eleve'
               and p.classe in (select public.mes_classes_prof()))
    or exists (select 1 from public.comptes_import c
             where c.identifiant = p_identifiant and c.role = 'eleve'
               and c.classe in (select public.mes_classes_prof())))
$$;
revoke all on function public.eleve_de_mes_classes(text) from public, anon;
grant execute on function public.eleve_de_mes_classes(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Demandes de suppression : l'enseignant coche, le gestionnaire efface
-- ---------------------------------------------------------------------------
create table if not exists public.demandes_suppression (
  identifiant text not null check (identifiant ~ '^PC-[A-Z0-9]{5}$'),
  demande_par uuid not null default auth.uid() references public.profils on delete cascade,
  motif       text check (char_length(motif) <= 300),
  cree_le     timestamptz not null default now(),
  primary key (identifiant, demande_par)
);
alter table public.demandes_suppression enable row level security;
drop policy if exists "suppression : enseignant demande pour ses classes" on public.demandes_suppression;
create policy "suppression : enseignant demande pour ses classes" on public.demandes_suppression for insert to authenticated
  with check (public.est_prof() and demande_par = auth.uid() and public.eleve_de_mes_classes(identifiant));
drop policy if exists "suppression : enseignant relit les siennes" on public.demandes_suppression;
create policy "suppression : enseignant relit les siennes" on public.demandes_suppression for select to authenticated
  using (demande_par = auth.uid() or public.est_gestionnaire());
drop policy if exists "suppression : enseignant retire les siennes" on public.demandes_suppression;
create policy "suppression : enseignant retire les siennes" on public.demandes_suppression for delete to authenticated
  using (demande_par = auth.uid() or public.est_gestionnaire());

-- Les comptes des classes de l'enseignant : activés (profils) et coupons pas encore utilisés.
-- La dernière connexion aide à repérer un doublon (un des deux comptes ne sert jamais).
create or replace function public.comptes_de_mes_classes()
returns table (identifiant text, classe text, active boolean, cree_le timestamptz,
               derniere_connexion timestamptz, suppression_demandee boolean, demandes integer)
language sql stable security definer set search_path = '' as $$
  with mes as (select public.mes_classes_prof() as classe_prof),
  comptes as (
    select p.identifiant, p.classe, true as active, p.cree_le, u.last_sign_in_at as derniere_connexion
      from public.profils p left join auth.users u on u.id = p.id
     where p.role = 'eleve' and p.classe in (select classe_prof from mes)
    union all
    select c.identifiant, c.classe, false, c.importe_le, null::timestamptz
      from public.comptes_import c
     where c.role = 'eleve' and c.classe in (select classe_prof from mes)
       and not exists (select 1 from public.profils p where p.identifiant = c.identifiant))
  select k.identifiant, k.classe, k.active, k.cree_le, k.derniere_connexion,
         exists (select 1 from public.demandes_suppression d where d.identifiant = k.identifiant and d.demande_par = auth.uid()),
         (select count(*)::int from public.demandes_suppression d where d.identifiant = k.identifiant)
    from comptes k
   where public.est_prof()
   order by k.classe, k.identifiant
$$;
revoke all on function public.comptes_de_mes_classes() from public, anon;
grant execute on function public.comptes_de_mes_classes() to authenticated;

-- Le gestionnaire : toutes les demandes, avec de quoi décider (état du compte, qui demande, pourquoi).
create or replace function public.gestion_suppressions()
returns table (identifiant text, classe text, active boolean, cree_le timestamptz, derniere_connexion timestamptz,
               demande_par text, classes_demandeur text[], motif text, demande_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.identifiant,
         coalesce(p.classe, c.classe),
         p.id is not null,
         coalesce(p.cree_le, c.importe_le),
         u.last_sign_in_at,
         dp.identifiant, dp.classes, d.motif, d.cree_le
    from public.demandes_suppression d
    join public.profils dp on dp.id = d.demande_par
    left join public.profils p on p.identifiant = d.identifiant and p.role = 'eleve'
    left join auth.users u on u.id = p.id
    left join public.comptes_import c on c.identifiant = d.identifiant and c.role = 'eleve'
   where public.est_gestionnaire()
   order by d.cree_le desc
$$;
revoke all on function public.gestion_suppressions() from public, anon;
grant execute on function public.gestion_suppressions() to authenticated;

-- Effacement définitif d'un compte ÉLÈVE, par le gestionnaire seul. Rend 'compte', 'coupon' ou 'rien'.
create or replace function public.effacer_compte_eleve(p_identifiant text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_resultat text := 'rien';
begin
  if not public.est_gestionnaire() then
    raise exception 'GESTIONNAIRE_SEUL : seul le gestionnaire du site efface des comptes.';
  end if;
  if exists (select 1 from public.profils where identifiant = p_identifiant and role <> 'eleve') then
    raise exception 'ELEVE_SEUL : ce compte n''est pas un compte élève.';
  end if;
  select id into v_id from public.profils where identifiant = p_identifiant and role = 'eleve';
  if v_id is not null then
    delete from auth.users where id = v_id;         -- profils et toutes ses données suivent (cascade)
    v_resultat := 'compte';
  end if;
  delete from public.comptes_import where identifiant = p_identifiant and role = 'eleve';
  if found and v_resultat = 'rien' then v_resultat := 'coupon'; end if;
  delete from public.demandes_suppression where identifiant = p_identifiant;
  return v_resultat;
end $$;
revoke all on function public.effacer_compte_eleve(text) from public, anon;
grant execute on function public.effacer_compte_eleve(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Messages des enseignants au gestionnaire (« Écrire à M. Van Hoorde »)
-- ---------------------------------------------------------------------------
create table if not exists public.messages_gestion (
  id         uuid primary key default gen_random_uuid(),
  auteur     uuid not null default auth.uid() references public.profils on delete cascade,
  ou         text check (char_length(ou) <= 120),      -- la vue à l'écran : « Tableau de bord », « Tutorat · … »
  message    text not null check (char_length(btrim(message)) between 3 and 2000),
  cree_le    timestamptz not null default now(),
  lu_le      timestamptz,
  reponse    text check (char_length(reponse) <= 2000),
  repondu_le timestamptz
);
create index if not exists messages_gestion_auteur_date on public.messages_gestion (auteur, cree_le desc);
alter table public.messages_gestion enable row level security;

drop policy if exists "message : enseignant écrit" on public.messages_gestion;
create policy "message : enseignant écrit" on public.messages_gestion for insert to authenticated
  with check (public.est_prof() and auteur = auth.uid()
              and lu_le is null and reponse is null and repondu_le is null);
drop policy if exists "message : auteur et gestionnaire lisent" on public.messages_gestion;
create policy "message : auteur et gestionnaire lisent" on public.messages_gestion for select to authenticated
  using (auteur = auth.uid() or public.est_gestionnaire());
drop policy if exists "message : gestionnaire répond" on public.messages_gestion;
create policy "message : gestionnaire répond" on public.messages_gestion for update to authenticated
  using (public.est_gestionnaire()) with check (public.est_gestionnaire());
drop policy if exists "message : auteur et gestionnaire suppriment" on public.messages_gestion;
create policy "message : auteur et gestionnaire suppriment" on public.messages_gestion for delete to authenticated
  using (auteur = auth.uid() or public.est_gestionnaire());

-- Le gestionnaire ne change que lu_le, reponse et repondu_le ; la date de réponse est celle du serveur.
create or replace function public.messages_gestion_reponse() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.auteur := old.auteur; new.ou := old.ou; new.message := old.message; new.cree_le := old.cree_le;
  if new.reponse is distinct from old.reponse then
    new.repondu_le := case when new.reponse is null then null else now() end;
    if new.reponse is not null and new.lu_le is null then new.lu_le := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists messages_gestion_reponse on public.messages_gestion;
create trigger messages_gestion_reponse before update on public.messages_gestion
  for each row execute function public.messages_gestion_reponse();

create or replace function public.messages_gestion_plafond() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.messages_gestion m
       where m.auteur = new.auteur and m.cree_le > now() - interval '24 hours') >= 30 then
    raise exception 'PLAFOND_MESSAGES : trente messages par jour au plus.';
  end if;
  return new;
end $$;
drop trigger if exists messages_gestion_plafond on public.messages_gestion;
create trigger messages_gestion_plafond before insert on public.messages_gestion
  for each row execute function public.messages_gestion_plafond();

-- Le gestionnaire voit qui écrit (identifiant et classes de l'auteur) par la règle « profil : prof voit tout »
-- du schéma : rien de neuf à ouvrir.

-- ---------------------------------------------------------------------------
-- Vérification (à coller à part, après le Run)
-- ---------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables
--  where tablename in ('gestionnaires','reglages_prof','demandes_suppression','messages_gestion') order by 1;
--   → quatre lignes, toutes à true
-- select p.identifiant from public.gestionnaires g join public.profils p on p.id = g.compte;
--   → votre identifiant PR-…, et lui seul
-- select proname from pg_proc where proname in ('est_gestionnaire','eleve_de_mes_classes','comptes_de_mes_classes',
--   'gestion_suppressions','effacer_compte_eleve','messages_gestion_reponse','messages_gestion_plafond') order by 1;
--   → sept fonctions
