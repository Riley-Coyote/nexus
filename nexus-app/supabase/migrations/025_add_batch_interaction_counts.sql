-- Function to get interaction counts for a batch of entry IDs.
-- This is much more efficient than calling get_interaction_counts for each entry individually.
create or replace function get_interaction_counts_for_entries(entry_ids uuid[])
returns table (
  entry_id uuid,
  resonance_count bigint,
  branch_count bigint,
  amplification_count bigint,
  share_count bigint
) as $$
begin
  return query
  select
    e.id as entry_id,
    coalesce(ic.resonance_count, 0) as resonance_count,
    coalesce(ic.branch_count, 0) as branch_count,
    coalesce(ic.amplification_count, 0) as amplification_count,
    coalesce(ic.share_count, 0) as share_count
  from
    stream_entries e
    left join interaction_counts ic on e.id = ic.entry_id
  where
    e.id = any(entry_ids);
end;
$$ language plpgsql stable; 