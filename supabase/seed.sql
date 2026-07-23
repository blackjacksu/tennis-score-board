-- Seed data: 3 teams, 8 lines, 24 matches (3 ties x 8 lines).
-- Run AFTER schema.sql, in the Supabase SQL Editor.
-- Edit team names and line labels freely - the app reads them from the database.

insert into teams (name, name_zh, color) values
  ('Team A', 'A 隊', '#ef4444'),
  ('Team B', 'B 隊', '#3b82f6'),
  ('Team C', 'C 隊', '#22c55e');

-- 8 lines; placeholder labels of 2 pairs per NTRP level. Rename as needed.
insert into lines (label, ntrp, sort_order) values
  ('3.0 - 1', '3.0', 1),
  ('3.0 - 2', '3.0', 2),
  ('3.5 - 1', '3.5', 3),
  ('3.5 - 2', '3.5', 4),
  ('4.0 - 1', '4.0', 5),
  ('4.0 - 2', '4.0', 6),
  ('4.5 - 1', '4.5', 7),
  ('4.5 - 2', '4.5', 8);

-- Round-robin ties: round 1 = A vs B, round 2 = A vs C, round 3 = B vs C.
-- Assumes a fresh database where team ids are 1, 2, 3 (as inserted above).
insert into matches (line_id, team_a_id, team_b_id, round)
select l.id, tie.a, tie.b, tie.round
from lines l
cross join (values (1, 2, 1), (1, 3, 2), (2, 3, 3)) as tie(a, b, round)
order by tie.round, l.sort_order;
