-- 2026 TAA Tennis Event seed: 3 teams (Red / Green / Yellow), 7 lines,
-- round-robin ties (Red-Green, Red-Yellow, Green-Yellow) => 21 matches.
-- Run AFTER schema.sql, in the Supabase SQL Editor. Then run players_import.sql.
-- Re-runnable: clears existing rows first.

truncate matches, players, lines, teams restart identity cascade;

-- Teams. Balanced so each team's combined NTRP total = 47.0.
insert into teams (name, name_zh, color) values
  ('Red',    '紅隊', '#ef4444'),
  ('Green',  '綠隊', '#22c55e'),
  ('Yellow', '黃隊', '#eab308');

-- 7 lines, ordered by combined NTRP (Line 1 strongest).
insert into lines (label, ntrp, sort_order) values
  ('Line 1', '8.0–9.0', 1),
  ('Line 2', '7.5–8.0', 2),
  ('Line 3', '7.0',     3),
  ('Line 4', '6.5–7.0', 4),
  ('Line 5', '6.0–6.5', 5),
  ('Line 6', '5.5–6.0', 6),
  ('Line 7', '4.5–5.0', 7);

-- Matches: for every tie, each line's pair plays its counterpart on the other team.
-- pair_a / pair_b are free text (the doubles pair names shown on each match card).
insert into matches (line_id, team_a_id, team_b_id, pair_a, pair_b, round)
select l.id, m.team_a_id, m.team_b_id, m.pair_a, m.pair_b, m.round
from (values
  -- round 1: Red (1) vs Green (2)
  (1, 1, 2, 'Andrew Liao / Fred Lin',        'Richard Lin / Willy Su',         1),
  (2, 1, 2, 'Ronald Feng / Mu-Ting Chien',   'Hung-Ying Lin / Vincent Tseng',  1),
  (3, 1, 2, 'Theo Pai / Christine Lin',      'Nate Raughley / Ramon Mangaser', 1),
  (4, 1, 2, 'Wendy Wang / 楊之安',            'Shih-Yen Pan / Janice Chen',     1),
  (5, 1, 2, 'Derrick Chueh / Tim Chen',      'Ben Chen / Tony Peng',           1),
  (6, 1, 2, 'Andy Lu / Zane Shao',           'Faye Chang / David Fang',        1),
  (7, 1, 2, 'Andy Chen / Avery Hsieh',       'Julie Hsieh / Jerry Chiu',       1),
  -- round 2: Red (1) vs Yellow (3)
  (1, 1, 3, 'Andrew Liao / Fred Lin',        'Ching-Yen Shih / Yu Cheng',      2),
  (2, 1, 3, 'Ronald Feng / Mu-Ting Chien',   'Kevin Chiang / Yi-Chih Wang',    2),
  (3, 1, 3, 'Theo Pai / Christine Lin',      'Peichun Su / Alice Liu',         2),
  (4, 1, 3, 'Wendy Wang / 楊之安',            'Thomas Yan / Andy Y.',           2),
  (5, 1, 3, 'Derrick Chueh / Tim Chen',      'Chris Lin / Joshua Lee',         2),
  (6, 1, 3, 'Andy Lu / Zane Shao',           'Daniel Tiedemann / Chih-Yu Lee', 2),
  (7, 1, 3, 'Andy Chen / Avery Hsieh',       'Martin Hsieh / Cody',            2),
  -- round 3: Green (2) vs Yellow (3)
  (1, 2, 3, 'Richard Lin / Willy Su',        'Ching-Yen Shih / Yu Cheng',      3),
  (2, 2, 3, 'Hung-Ying Lin / Vincent Tseng', 'Kevin Chiang / Yi-Chih Wang',    3),
  (3, 2, 3, 'Nate Raughley / Ramon Mangaser','Peichun Su / Alice Liu',         3),
  (4, 2, 3, 'Shih-Yen Pan / Janice Chen',    'Thomas Yan / Andy Y.',           3),
  (5, 2, 3, 'Ben Chen / Tony Peng',          'Chris Lin / Joshua Lee',         3),
  (6, 2, 3, 'Faye Chang / David Fang',       'Daniel Tiedemann / Chih-Yu Lee', 3),
  (7, 2, 3, 'Julie Hsieh / Jerry Chiu',      'Martin Hsieh / Cody',            3)
) as m(sort_order, team_a_id, team_b_id, pair_a, pair_b, round)
join lines l on l.sort_order = m.sort_order;
