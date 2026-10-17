-- Résonance — migration 006 (17/10/2026) : « J'ai vu un bug », les signalements des élèves.
-- Uniquement des ajouts : aucune table existante n'est modifiée. Suppose la migration 005 déjà collée
-- (fonction mes_classes_prof).
-- À coller une fois dans Supabase : SQL Editor → New query → Run. Peut être relancée sans dommage.
--
-- BESOIN (repris du site pédagogique de M. Van Hoorde, 03/10 et 11/10/2026)
--   Un bouton « J'ai vu un bug » pour l'élève connecté, sur toutes les vues de Résonance et toutes les
--   pages du parcours Python. Le signalement arrive dans le Tableau de bord, section Signalements.
--   Un signalement retenu (erreur trouvée, amélioration intéressante) rapporte +0,5 au prochain contrôle ;
--   l'élève en est prévenu une fois, à l'ouverture de Résonance.
--
-- ARBITRAGES
--   · Élèves CONNECTÉS seulement (est_eleve()) : un formulaire ouvert au public serait une boîte à spam.
--   · L'élève écrit SES signalements, jamais déjà traités, et ne les relit pas. Deux fonctions lui rendent
--     ses +0,5 pas encore vus et les marquent vus : rien d'autre, et rien d'un autre élève.
--   · L'enseignant lit, marque traité, supprime les signalements des élèves de SES classes
--     (mes_classes_prof(), migration 005) — premières comprises, si leur classe est rattachée à son compte.
--   · Le +0,5 ne vaut que pour les élèves de TERMINALE (règle de M. Van Hoorde : ses élèves, et eux seuls).
--     Même règle que espaceComplet() de commun.js : classe « …_T_… », ou commençant par « T » (« TEST »).
--     La base refuse le bonus pour toute autre classe ; un signalement de première reste lisible et traitable.
--   · Accorder le bonus marque traité ; la date est celle du serveur ; le retirer efface aussi « vu »
--     (un bonus accordé de nouveau se notifie de nouveau).
--
-- RGPD
--   Le formulaire ne demande ni nom ni prénom (décision de M. Van Hoorde, 17/10/2026) : l'élève est
--   reconnu par son compte. Bouton réservé aux élèves de terminale (côté pages). L'« appareil » est un résumé
--   court (« iPad · Safari · 1024×768 »), jamais l'empreinte du navigateur. La suppression d'un compte
--   emporte ses signalements ; fin d'année : delete from public.signalements;

create table if not exists public.signalements (
  id          uuid primary key default gen_random_uuid(),
  eleve       uuid not null default auth.uid() references public.profils on delete cascade,
  -- La rubrique : 'accueil', 'tutorat', 'participation', 'outils', 'python' (accueil du parcours),
  -- 'python-n1' … 'python-n5'.
  cle         text not null check (cle ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  -- Où : le fichier (« index.html », « niveau-2.html ») et la vue ou l'exercice à l'écran.
  page        text not null check (char_length(page) between 1 and 120),
  etape       text check (char_length(etape) <= 120),
  message     text not null check (char_length(btrim(message)) between 3 and 1000),
  appareil    text check (char_length(appareil) <= 120),
  traite      boolean not null default false,
  bonus_le    timestamptz,   -- +0,5 accordé par l'enseignant (date du serveur), ou null
  bonus_vu_le timestamptz,   -- date à laquelle l'élève a vu la fenêtre du bonus, ou null
  cree_le     timestamptz not null default now()
);
create index if not exists signalements_eleve_date on public.signalements (eleve, cree_le desc);
alter table public.signalements enable row level security;

comment on table public.signalements is
  'Bugs signalés par les élèves (« J''ai vu un bug »). Lus par les enseignants de leurs classes. Seul endroit de la base où figure un nom (en tête du message).';

-- ---------------------------------------------------------------------------
-- Classe de terminale : même règle que espaceComplet() dans commun.js.
-- ---------------------------------------------------------------------------
create or replace function public.classe_terminale(c text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(c ~* '_T_' or btrim(c) ~* '^t', false)
$$;

-- ---------------------------------------------------------------------------
-- Garde-fou : vingt signalements par élève et par jour, au plus.
-- ---------------------------------------------------------------------------
create or replace function public.signalements_plafond() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.signalements s
       where s.eleve = new.eleve and s.cree_le > now() - interval '24 hours') >= 20 then
    raise exception 'PLAFOND_SIGNALEMENTS : vingt signalements par jour au plus.';
  end if;
  return new;
end $$;
drop trigger if exists signalements_plafond on public.signalements;
create trigger signalements_plafond before insert on public.signalements
  for each row execute function public.signalements_plafond();

-- ---------------------------------------------------------------------------
-- Le +0,5 : terminales seulement, date du serveur, marque traité, « vu » remis à zéro quand il change.
-- L'enseignant n'écrit que bonus_le (droit de colonne, plus bas) ; jamais bonus_vu_le.
-- ---------------------------------------------------------------------------
create or replace function public.signalements_bonus() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.bonus_le is distinct from old.bonus_le then
    if new.bonus_le is not null then
      if not exists (select 1 from public.profils p
                      where p.id = new.eleve and public.classe_terminale(p.classe)) then
        raise exception 'BONUS_TERMINALE : le +0,5 ne s''accorde qu''aux élèves de terminale.';
      end if;
      new.bonus_le := coalesce(old.bonus_le, now());
      new.traite   := true;
    end if;
    if new.bonus_le is distinct from old.bonus_le then
      new.bonus_vu_le := null;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists signalements_bonus on public.signalements;
create trigger signalements_bonus before update on public.signalements
  for each row execute function public.signalements_bonus();

-- ---------------------------------------------------------------------------
-- Règles d'accès
-- ---------------------------------------------------------------------------
-- L'élève écrit les siens, jamais traités ni « bonifiés ». Aucune règle de lecture pour lui.
drop policy if exists "signalement : élève envoie le sien" on public.signalements;
create policy "signalement : élève envoie le sien" on public.signalements for insert to authenticated
  with check (public.est_eleve() and eleve = auth.uid()
              and traite = false and bonus_le is null and bonus_vu_le is null);

-- L'enseignant : les élèves de ses classes, et seulement eux.
drop policy if exists "signalement : prof lit ses classes" on public.signalements;
create policy "signalement : prof lit ses classes" on public.signalements for select to authenticated
  using (public.est_prof() and exists (
    select 1 from public.profils p
    where p.id = signalements.eleve and p.classe in (select public.mes_classes_prof())));

drop policy if exists "signalement : prof traite ses classes" on public.signalements;
create policy "signalement : prof traite ses classes" on public.signalements for update to authenticated
  using (public.est_prof() and exists (
    select 1 from public.profils p
    where p.id = signalements.eleve and p.classe in (select public.mes_classes_prof())))
  with check (public.est_prof() and exists (
    select 1 from public.profils p
    where p.id = signalements.eleve and p.classe in (select public.mes_classes_prof())));

drop policy if exists "signalement : prof supprime ses classes" on public.signalements;
create policy "signalement : prof supprime ses classes" on public.signalements for delete to authenticated
  using (public.est_prof() and exists (
    select 1 from public.profils p
    where p.id = signalements.eleve and p.classe in (select public.mes_classes_prof())));

-- Droits par colonne : l'élève n'envoie que le contenu (eleve, traite, dates : valeurs par défaut) ;
-- l'enseignant ne modifie que « traite » et « bonus_le ».
revoke all on table public.signalements from anon, authenticated;
grant insert (cle, page, etape, message, appareil) on table public.signalements to authenticated;
grant select, delete on table public.signalements to authenticated;
grant update (traite, bonus_le) on table public.signalements to authenticated;

-- ---------------------------------------------------------------------------
-- Côté élève : mes +0,5 pas encore vus, et « je les ai vus ».
-- ---------------------------------------------------------------------------
create or replace function public.mes_bonus_signalement()
returns table (id uuid, cree_le timestamptz, cle text, etape text, extrait text, bonus_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.cree_le, s.cle, s.etape,
         -- sans la ligne « 👤 Nom Prénom » ajoutée par le formulaire
         left(regexp_replace(s.message, '^👤[^\n]*\n', ''), 120), s.bonus_le
  from public.signalements s
  where s.eleve = auth.uid() and s.bonus_le is not null and s.bonus_vu_le is null
  order by s.bonus_le
$$;

create or replace function public.bonus_signalement_vus(p_ids uuid[]) returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  update public.signalements s set bonus_vu_le = now()
   where s.id = any(p_ids) and s.eleve = auth.uid()
     and s.bonus_le is not null and s.bonus_vu_le is null;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.classe_terminale(text)       from public, anon;
revoke all on function public.signalements_plafond()       from public, anon, authenticated;
revoke all on function public.signalements_bonus()         from public, anon, authenticated;
revoke all on function public.mes_bonus_signalement()      from public, anon;
revoke all on function public.bonus_signalement_vus(uuid[]) from public, anon;
grant execute on function public.classe_terminale(text)        to authenticated;
grant execute on function public.mes_bonus_signalement()       to authenticated;
grant execute on function public.bonus_signalement_vus(uuid[]) to authenticated;

-- ============================================================================
-- Vérification (à coller après le Run, résultat attendu en commentaire)
--
-- select c.relname, c.relrowsecurity, count(p.polname)
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--   left join pg_policy p on p.polrelid = c.oid
--  where n.nspname = 'public' and c.relname = 'signalements'
--  group by c.relname, c.relrowsecurity;
--   → 1 ligne : signalements | true | 4
--
-- select tgname from pg_trigger where tgrelid = 'public.signalements'::regclass and not tgisinternal order by 1;
--   → signalements_bonus, signalements_plafond
--
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--    and proname in ('classe_terminale','signalements_plafond','signalements_bonus',
--                    'mes_bonus_signalement','bonus_signalement_vus') order by 1;
--   → 5 lignes
--
-- select public.classe_terminale('B1_T_3_PH-CH_VANHOORDE'), public.classe_terminale('TEST'),
--        public.classe_terminale('B2_P_3_PH-CH_HUSSON'), public.classe_terminale(null);
--   → true | true | false | false
-- ============================================================================
