-- 079_training_demand.sql
--
-- Demand-validation capture for the training & qualifications feature (go-live
-- map S1; assessment at .planning/go-live/issues/06-training-quals-assessment.md).
-- One row per user: what training would help, for themselves or their staff.
--
-- Design decisions, so they are not re-derived:
--   - skill_ids references the SAME 24-competency taxonomy the match engine
--     uses (public.skills, Phase 23). Responses therefore join directly against
--     future training_offerings.skill_ids: the partner-signal query is a join,
--     not a re-survey. uuid[] rather than an FK join table because this is
--     analytics capture, not relational truth; the admin summary tolerates a
--     deleted skill id disappearing from the join.
--   - No role column: derivable via user_roles at query time; storing it would
--     just let the two disagree.
--   - unique(user_id) + upsert: one living answer per user, updatable, rather
--     than an append log nobody deduplicates.
--   - RLS own-row only. Aggregates leave via the _admin_gate() RPC below, never
--     via client select.

create table public.training_demand (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  audience text not null check (audience in ('self', 'staff')),
  skill_ids uuid[] not null default '{}' check (cardinality(skill_ids) <= 24),
  other_text text check (char_length(other_text) <= 500),
  context text not null default 'unknown' check (char_length(context) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.training_demand enable row level security;

create policy training_demand_insert_own on public.training_demand
  for insert to authenticated with check (user_id = auth.uid());
create policy training_demand_select_own on public.training_demand
  for select to authenticated using (user_id = auth.uid());
create policy training_demand_update_own on public.training_demand
  for update to authenticated using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin aggregate — the "which training partners to pursue" query, shipped now
-- so the capture is queryable from day one. Template per 023: SECURITY DEFINER,
-- search_path pinned, _admin_gate() first, authenticated EXECUTE (the gate is
-- the boundary), anon revoked.
create or replace function public.admin_training_demand_summary()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  perform public._admin_gate();
  return jsonb_build_object(
    'total_responses', (select count(*) from training_demand),
    'by_skill', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'skill', s.name, 'category', s.category, 'responses', t.n)
               order by t.n desc, s.name), '[]'::jsonb)
      from (select unnest(skill_ids) sid, count(*) n
            from training_demand group by 1) t
      join skills s on s.id = t.sid
    ),
    'by_role_audience', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'role', r.role, 'audience', r.audience, 'responses', r.n)
               order by r.n desc), '[]'::jsonb)
      from (select ur.role, td.audience, count(*) n
            from training_demand td
            join user_roles ur on ur.user_id = td.user_id
            group by 1, 2) r
    ),
    'free_text', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'role', ur.role, 'audience', td.audience, 'text', td.other_text,
               'at', td.updated_at)
               order by td.updated_at desc), '[]'::jsonb)
      from (select * from training_demand
            where other_text is not null and other_text <> ''
            order by updated_at desc limit 50) td
      join user_roles ur on ur.user_id = td.user_id
    )
  );
end;
$$;

revoke execute on function public.admin_training_demand_summary() from public, anon;
grant execute on function public.admin_training_demand_summary() to authenticated;
