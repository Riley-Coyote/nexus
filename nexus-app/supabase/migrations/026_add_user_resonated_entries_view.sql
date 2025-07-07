-- Creates a convenience view that returns every entry a user has resonated with
-- together with its interaction-count columns.  It relies on RLS of the
-- underlying tables so it automatically hides private rows unless
-- `user_id = auth.uid()`.

-- Up --------------------------------------------------------------
create or replace view public.user_resonated_entries_v as
select
    se.*,
    eic.resonance_count,
    eic.branch_count,
    eic.amplification_count,
    eic.share_count,
    ur.user_id          as resonator_id  -- handy for auditing / joins
from public.user_resonances ur
join public.stream_entries   se  on se.id = ur.entry_id
left join public.entry_interaction_counts eic on eic.entry_id = se.id;

-- Down ------------------------------------------------------------
drop view if exists public.user_resonated_entries_v; 