-- Function to get interaction counts for a batch of entry IDs.
-- This is much more efficient than calling get_interaction_counts for each entry individually.
create or replace function get_interaction_counts_for_entries(entry_ids bigint[])
returns table (
  entry_id bigint,
  resonance_count integer,
  branch_count integer,
  amplification_count integer,
  share_count integer
) as $$
begin
  return query
  select
    e.id as entry_id,
    coalesce(eic.resonance_count, 0) as resonance_count,
    coalesce(eic.branch_count, 0) as branch_count,
    coalesce(eic.amplification_count, 0) as amplification_count,
    coalesce(eic.share_count, 0) as share_count
  from
    stream_entries e
    left join entry_interaction_counts eic on e.id = eic.entry_id
  where
    e.id = any(entry_ids);
end;
$$ language plpgsql stable; 