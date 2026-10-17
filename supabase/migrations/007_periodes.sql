-- Résonance — migration 007 (17/10/2026) : périodes de participation et note de période sur 20.
-- Suppose les migrations 004 (participation, dépôts), 005 (mes_classes_prof) et 006 (signalements) collées.
-- À coller une fois dans Supabase : SQL Editor → New query → Run. Peut être relancée sans dommage.
--
-- BESOIN (M. Van Hoorde, 17/10/2026)
--   Le suivi de participation se fait par PÉRIODE (une entre deux vacances, cinq dans l'année), et non plus
--   sur l'année. À chaque fin de période, l'enseignant saisit la note de prise de notes, vérifie les bonus
--   proposés, puis clôture : la note de période est publiée à l'élève, la période suivante s'ouvre.
--
-- BARÈME (décisions du 17/10/2026), note sur 20, plafonnée à 20 :
--   participation orale /10      calculée par l'application de participation, publiée par l'enseignant
--   prise de notes /10           saisie par l'enseignant en fin de période
--   dépôts bonus                 0 · 0,5 · 1 · 1,5 par dépôt validé, choisi à la validation
--   tutorat                      proposé : +1 par séance comme tuteur, +0,5 par séance comme tutoré
--                                (séances validées, date passée, dans la période), 5 au plus ;
--                                l'enseignant règle le curseur, qui remplace la proposition
--   signalements                 +0,5 par signalement retenu (006), 2 au plus par période : la base refuse
--                                le 5e +0,5 d'une même période
--
-- ARBITRAGES
--   · Une période appartient à une classe Résonance (« B1_T_3_PH-CH_VANHOORDE »). Elle va de « debut » à
--     « fin » (exclue) ; une seule ouverte par classe. Un dépôt compte dans la période de sa validation, un
--     signalement dans celle de son +0,5, une séance de tutorat dans celle de son jour (le jour de la clôture
--     compte déjà pour la période suivante).
--   · La clôture FIGE les bonus de dépôts et de signalements, et fixe le curseur du tutorat. La participation,
--     la prise de notes et le curseur restent modifiables après la clôture : la note se recalcule.
--   · L'élève lit ses périodes par mon_bilan() seulement, plus par la table : la note de prise de notes et la
--     note de période lui restent cachées tant que la période n'est pas close.
--   · L'enseignant ne lit et ne modifie que les élèves de SES classes (mes_classes_prof()).
--
-- RGPD : aucun nom. Des notes rangées par identifiant de compte, comme les points de participation (004).
-- Fin d'année : delete from public.participation_suivi; delete from public.periodes;

-- ---------------------------------------------------------------------------
-- 1. Les périodes
-- ---------------------------------------------------------------------------
create table if not exists public.periodes (
  classe text not null,
  numero smallint not null check (numero between 1 and 5),
  debut  timestamptz not null default now(),
  fin    timestamptz,
  prof   uuid not null default auth.uid() references public.profils on delete cascade,
  primary key (classe, numero),
  check (fin is null or fin > debut)
);
create unique index if not exists periodes_une_ouverte on public.periodes (classe) where fin is null;
alter table public.periodes enable row level security;

drop policy if exists "période : prof lit ses classes" on public.periodes;
create policy "période : prof lit ses classes" on public.periodes for select to authenticated
  using (public.est_prof() and classe in (select public.mes_classes_prof()));
-- L'enseignant ouvre la P1 d'une classe ; la clôture (fin, période suivante) passe par cloturer_periode().
drop policy if exists "période : prof ouvre la première" on public.periodes;
create policy "période : prof ouvre la première" on public.periodes for insert to authenticated
  with check (public.est_prof() and prof = auth.uid() and numero = 1 and fin is null
              and classe in (select public.mes_classes_prof()));
drop policy if exists "période : élève lit celles de sa classe" on public.periodes;
create policy "période : élève lit celles de sa classe" on public.periodes for select to authenticated
  using (classe = public.ma_classe());

revoke all on table public.periodes from anon, authenticated;
grant select on table public.periodes to authenticated;
grant insert (classe, numero) on table public.periodes to authenticated;

-- La période 1 des classes déjà ouvertes à la participation commence à la rentrée.
insert into public.periodes (classe, numero, debut, prof)
select c.classe, 1, timestamptz '2026-09-01 00:00 Europe/Paris', c.prof from public.classes_participation c
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Le suivi : une ligne par élève ET par période
-- ---------------------------------------------------------------------------
alter table public.participation_suivi
  add column if not exists periode           smallint not null default 1 check (periode between 1 and 5),
  add column if not exists participation     numeric(3,1) check (participation between 0 and 10),
  add column if not exists tirages           smallint not null default 0,
  add column if not exists notes             numeric(3,1) check (notes between 0 and 10),
  add column if not exists tutorat           numeric(2,1) check (tutorat between 0 and 5),
  add column if not exists depots_fige       numeric(4,1),
  add column if not exists signalements_fige numeric(2,1),
  add column if not exists clos_le           timestamptz;

comment on column public.participation_suivi.participation is 'Participation orale sur 10, publiée depuis l''application de participation.';
comment on column public.participation_suivi.notes is 'Prise de notes sur 10, saisie par l''enseignant ; cachée à l''élève avant la clôture.';
comment on column public.participation_suivi.tutorat is 'Curseur du tutorat (0 à 5) ; null : la proposition calculée fait foi.';

-- Les lignes publiées avant cette migration n'ont que les points : même calcul que l'application (sur10).
update public.participation_suivi set participation = least(10, round(points * 10.0 / objectif, 1))
 where participation is null and objectif > 0;

alter table public.participation_suivi drop constraint if exists participation_suivi_pkey;
alter table public.participation_suivi add constraint participation_suivi_pkey primary key (eleve, periode);

-- L'enseignant : les élèves de ses classes seulement (avant : tout enseignant). L'élève : mon_bilan().
drop policy if exists "suivi : prof gère" on public.participation_suivi;
create policy "suivi : prof gère" on public.participation_suivi for all to authenticated
  using (public.est_prof() and exists (select 1 from public.profils p
          where p.id = participation_suivi.eleve and p.classe in (select public.mes_classes_prof())))
  with check (public.est_prof() and exists (select 1 from public.profils p
          where p.id = participation_suivi.eleve and p.classe in (select public.mes_classes_prof())));
drop policy if exists "suivi : élève voit le sien" on public.participation_suivi;

-- ---------------------------------------------------------------------------
-- 3. Dépôts : 0 · 0,5 · 1 · 1,5
-- ---------------------------------------------------------------------------
alter table public.depots drop constraint if exists depots_points_bonus_check;
alter table public.depots add constraint depots_points_bonus_check check (points_bonus in (0, 0.5, 1, 1.5));

-- ---------------------------------------------------------------------------
-- 4. Signalements : 2 points au plus par période (quatre +0,5)
--    Reprise de signalements_bonus() (006), le plafond en plus.
-- ---------------------------------------------------------------------------
create or replace function public.signalements_bonus() returns trigger
language plpgsql security definer set search_path = '' as $$
declare per public.periodes;
begin
  if new.bonus_le is distinct from old.bonus_le then
    if new.bonus_le is not null then
      if not exists (select 1 from public.profils p
                      where p.id = new.eleve and public.classe_terminale(p.classe)) then
        raise exception 'BONUS_TERMINALE : le +0,5 ne s''accorde qu''aux élèves de terminale.';
      end if;
      new.bonus_le := coalesce(old.bonus_le, now());
      new.traite   := true;
      if old.bonus_le is null then
        select x.* into per from public.periodes x join public.profils p on p.classe = x.classe
         where p.id = new.eleve and x.fin is null;
        if found and (select count(*) from public.signalements s
                       where s.eleve = new.eleve and s.id <> new.id
                         and s.bonus_le >= per.debut) >= 4 then
          raise exception 'PLAFOND_BONUS_PERIODE : 2 points de signalements au plus par période.';
        end if;
      end if;
    end if;
    if new.bonus_le is distinct from old.bonus_le then
      new.bonus_vu_le := null;
    end if;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Le calcul du bilan d'une période (interne : jamais appelé directement par un client)
-- ---------------------------------------------------------------------------
create or replace function public.bilan_periode_calcul(p_classe text, p_numero smallint)
returns table (eleve uuid, identifiant text, participation numeric, points integer, objectif integer,
               seances integer, presences integer, roles integer, tirages integer, maj_le timestamptz,
               notes numeric, depots numeric, nb_depots integer, signalements numeric, nb_signalements integer,
               seances_tuteur integer, seances_tutore integer, tutorat_propose numeric, tutorat_curseur numeric,
               tutorat numeric, note numeric, clos_le timestamptz)
language sql stable security definer set search_path = '' as $$
  with per as (
    select x.debut, x.fin,
           (x.debut at time zone 'Europe/Paris')::date as j0,
           (x.fin   at time zone 'Europe/Paris')::date as j1
    from public.periodes x where x.classe = p_classe and x.numero = p_numero
  ), el as (
    select p.id, p.identifiant from public.profils p where p.classe = p_classe and p.role = 'eleve'
  ), calc as (
    select el.id, el.identifiant, s.participation, s.points, s.objectif, s.seances, s.presences, s.roles,
           s.tirages, s.maj_le, s.notes, s.tutorat as curseur, s.clos_le, s.depots_fige, s.signalements_fige,
           (select coalesce(sum(d.points_bonus), 0) from public.depots d
             where d.auteur = el.id and d.statut = 'valide'
               and d.valide_le >= per.debut and (per.fin is null or d.valide_le < per.fin)) as dep,
           (select count(*) from public.depots d
             where d.auteur = el.id and d.statut = 'valide' and d.points_bonus > 0
               and d.valide_le >= per.debut and (per.fin is null or d.valide_le < per.fin))::integer as n_dep,
           (select count(*) from public.signalements g
             where g.eleve = el.id and g.bonus_le >= per.debut and (per.fin is null or g.bonus_le < per.fin))::integer as n_sig,
           (select count(*) from public.seances t
             where t.tuteur = el.id and t.jour >= per.j0 and (per.j1 is null or t.jour < per.j1)
               and t.jour <= (now() at time zone 'Europe/Paris')::date)::integer as n_tut,
           (select count(*) from public.seances t
             where el.id = any(t.tutores) and t.jour >= per.j0 and (per.j1 is null or t.jour < per.j1)
               and t.jour <= (now() at time zone 'Europe/Paris')::date)::integer as n_aid
    from el cross join per
    left join public.participation_suivi s on s.eleve = el.id and s.periode = p_numero
  ), fin as (
    select c.*,
           least(5::numeric, c.n_tut + 0.5 * c.n_aid) as propose,
           case when c.clos_le is null then c.dep else coalesce(c.depots_fige, 0) end as dep_retenu,
           case when c.clos_le is null then least(2::numeric, 0.5 * c.n_sig) else coalesce(c.signalements_fige, 0) end as sig_retenu
    from calc c
  )
  select f.id, f.identifiant, f.participation, coalesce(f.points, 0), coalesce(f.objectif, 0),
         coalesce(f.seances, 0), coalesce(f.presences, 0), coalesce(f.roles, 0), coalesce(f.tirages, 0), f.maj_le,
         f.notes, f.dep_retenu, f.n_dep, f.sig_retenu, f.n_sig, f.n_tut, f.n_aid, f.propose, f.curseur,
         coalesce(f.curseur, f.propose),
         least(20::numeric, coalesce(f.participation, 0) + coalesce(f.notes, 0) + f.dep_retenu + f.sig_retenu
                            + coalesce(f.curseur, f.propose)),
         f.clos_le
  from fin f
  order by f.identifiant
$$;

-- L'enseignant : le bilan d'une classe à lui (vide sinon).
create or replace function public.bilan_classe(p_classe text, p_numero smallint)
returns table (eleve uuid, identifiant text, participation numeric, points integer, objectif integer,
               seances integer, presences integer, roles integer, tirages integer, maj_le timestamptz,
               notes numeric, depots numeric, nb_depots integer, signalements numeric, nb_signalements integer,
               seances_tuteur integer, seances_tutore integer, tutorat_propose numeric, tutorat_curseur numeric,
               tutorat numeric, note numeric, clos_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.bilan_periode_calcul(p_classe, p_numero)
  where public.est_prof() and p_classe in (select public.mes_classes_prof())
$$;

-- L'élève : toutes les périodes de sa classe, sa ligne seulement. Prise de notes et note cachées avant la clôture.
create or replace function public.mon_bilan()
returns table (periode smallint, debut timestamptz, fin timestamptz, participation numeric, points integer,
               objectif integer, seances integer, presences integer, roles integer, maj_le timestamptz,
               notes numeric, depots numeric, nb_depots integer, signalements numeric, nb_signalements integer,
               seances_tuteur integer, seances_tutore integer, tutorat numeric, note numeric, clos_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.numero, x.debut, x.fin, b.participation, b.points, b.objectif, b.seances, b.presences, b.roles, b.maj_le,
         case when b.clos_le is null then null else b.notes end,
         b.depots, b.nb_depots, b.signalements, b.nb_signalements, b.seances_tuteur, b.seances_tutore, b.tutorat,
         case when b.clos_le is null then null else b.note end,
         b.clos_le
  from public.periodes x
  cross join lateral public.bilan_periode_calcul(x.classe, x.numero) b
  where public.est_eleve() and x.classe = public.ma_classe() and b.eleve = auth.uid()
  order by x.numero
$$;

-- ---------------------------------------------------------------------------
-- 6. La clôture : fige les bonus, fixe le curseur du tutorat, ferme la période, ouvre la suivante.
--    Rend le numéro de la période ouverte (null après la période 5).
-- ---------------------------------------------------------------------------
create or replace function public.cloturer_periode(p_classe text, p_numero smallint) returns smallint
language plpgsql volatile security definer set search_path = '' as $$
declare instant timestamptz := now();
begin
  if not (public.est_prof() and p_classe in (select public.mes_classes_prof())) then
    raise exception 'CLOTURE_REFUSEE : cette classe n''est pas la vôtre.';
  end if;
  if not exists (select 1 from public.periodes x where x.classe = p_classe and x.numero = p_numero and x.fin is null) then
    raise exception 'PERIODE_NON_OUVERTE : la période % de % n''est pas ouverte.', p_numero, p_classe;
  end if;

  insert into public.participation_suivi as s (eleve, periode, tutorat, depots_fige, signalements_fige, clos_le)
  select b.eleve, p_numero, b.tutorat, b.depots, b.signalements, instant
  from public.bilan_periode_calcul(p_classe, p_numero) b
  on conflict (eleve, periode) do update
    set tutorat = excluded.tutorat, depots_fige = excluded.depots_fige,
        signalements_fige = excluded.signalements_fige, clos_le = excluded.clos_le;

  update public.periodes set fin = instant where classe = p_classe and numero = p_numero;
  if p_numero < 5 then
    insert into public.periodes (classe, numero, debut, prof) values (p_classe, p_numero + 1, instant, auth.uid());
    return p_numero + 1;
  end if;
  return null;
end $$;

revoke all on function public.bilan_periode_calcul(text, smallint) from public, anon, authenticated;
revoke all on function public.bilan_classe(text, smallint)         from public, anon;
revoke all on function public.mon_bilan()                          from public, anon;
revoke all on function public.cloturer_periode(text, smallint)     from public, anon;
grant execute on function public.bilan_classe(text, smallint)     to authenticated;
grant execute on function public.mon_bilan()                      to authenticated;
grant execute on function public.cloturer_periode(text, smallint) to authenticated;

-- ============================================================================
-- Vérification (à coller après le Run, résultat attendu en commentaire)
--
-- select classe, numero, debut, fin from public.periodes order by 1, 2;
--   → B1_T_3_PH-CH_VANHOORDE | 1 | 2026-09-01 … | null
--
-- select count(*), count(distinct eleve), min(periode), max(periode) from public.participation_suivi;
--   → autant de lignes que d'élèves suivis, toutes en période 1
--
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--    and proname in ('bilan_periode_calcul','bilan_classe','mon_bilan','cloturer_periode') order by 1;
--   → 4 lignes
-- ============================================================================
