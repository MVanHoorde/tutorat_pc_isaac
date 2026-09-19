-- Résonance — migration 002 (19/09/2026)
-- Le tuteur indique, en se positionnant, les créneaux de la demande qui lui conviennent.
-- À coller une fois dans Supabase : SQL Editor → New query → Run.

alter table public.positionnements
  add column if not exists creneaux text[] not null default '{}';
