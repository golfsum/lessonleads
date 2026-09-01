-- Conversation starts are created by the chat route, not by browser analytics.
-- Preserve the earliest event from any historical duplicate set, then enforce
-- one conversation start per widget session at the database boundary.
with ranked_conversation_starts as (
  select
    id,
    row_number() over (
      partition by widget_id, session_id
      order by occurred_at asc, id asc
    ) as duplicate_rank
  from public.widget_events
  where event_name = 'conversation_started'
)
delete from public.widget_events event
using ranked_conversation_starts ranked
where event.id = ranked.id
  and ranked.duplicate_rank > 1;

create unique index if not exists widget_events_conversation_started_session_unique
  on public.widget_events(widget_id, session_id)
  where event_name = 'conversation_started';
