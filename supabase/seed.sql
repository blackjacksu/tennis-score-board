-- 2026 TAA Tennis Event seed: 3 teams (Red / Green / Yellow), 8 lines,
-- round-robin ties (Red-Green, Red-Yellow, Green-Yellow) => 24 matches.
-- Run AFTER schema.sql, in the Supabase SQL Editor. Then run players_import.sql.
-- Re-runnable: clears existing rows first.
--
-- 47 players (49 sign-ups − 2 dropouts). 24 pairs need 48 slots, so Willy Su
-- doubles up: he plays Red's Line 1 AND Line 3.
-- Team combined-NTRP totals: Red 52.5 · Green 52.0 · Yellow 52.0.

truncate matches, players, lines, teams restart identity cascade;

insert into teams (name, name_zh, color) values
  ('Red',    '紅隊', '#ef4444'),
  ('Green',  '綠隊', '#22c55e'),
  ('Yellow', '黃隊', '#eab308');

-- 8 lines, ordered by combined NTRP (Line 1 strongest).
insert into lines (label, ntrp, sort_order) values
  ('Line 1', '8.0–9.0', 1),
  ('Line 2', '8.0',     2),
  ('Line 3', '7.0–7.5', 3),
  ('Line 4', '6.5–7.0', 4),
  ('Line 5', '6.5',     5),
  ('Line 6', '6.0',     6),
  ('Line 7', '5.0–5.5', 7),
  ('Line 8', '3.0–4.5', 8);

-- Matches: for every tie, each line's pair plays its counterpart on the other team.
insert into matches (line_id, team_a_id, team_b_id, pair_a, pair_b, round)
select l.id, m.team_a_id, m.team_b_id, m.pair_a, m.pair_b, m.round
from (values
  -- round 1: Red (1) vs Green (2)
  (1, 1, 2, 'Richard Lin / Willy Su',        'Andrew Liao / Fred Lin',          1),
  (2, 1, 2, 'Kevin Chiang / Yi-Chih Wang',   'Hung-Ying Lin / Vincent Tseng',   1),
  (3, 1, 2, 'Willy Su / Mu-Ting Chien',      'Theo Pai / Christine Lin',        1),
  (4, 1, 2, 'Wendy Wang / 楊之安',            'Peichun Su / Alice Liu',          1),
  (5, 1, 2, 'Derrick Chueh / Tim Chen',      'Shih-Yen Pan / Janice Chen',      1),
  (6, 1, 2, 'Chris Lin / Joshua Lee',        'Daniel Tiedemann / Chih-Yu Lee',  1),
  (7, 1, 2, 'Andy Chen / Avery Hsieh',       'Andy Lu / Zane Shao',             1),
  (8, 1, 2, 'Julie Hsieh / Jerry Chiu',      'Margot Lai / Grace Shih',         1),
  -- round 2: Red (1) vs Yellow (3)
  (1, 1, 3, 'Richard Lin / Willy Su',        'Ching-Yen Shih / Yu Cheng',       2),
  (2, 1, 3, 'Kevin Chiang / Yi-Chih Wang',   '鄧之彬 / Ronald Feng',            2),
  (3, 1, 3, 'Willy Su / Mu-Ting Chien',      'Nate Raughley / Ramon Mangaser',  2),
  (4, 1, 3, 'Wendy Wang / 楊之安',            'Thomas Yan / Andy Chung',         2),
  (5, 1, 3, 'Derrick Chueh / Tim Chen',      'Ben Chen / Tony Peng',            2),
  (6, 1, 3, 'Chris Lin / Joshua Lee',        'Faye Chang / David Fang',         2),
  (7, 1, 3, 'Andy Chen / Avery Hsieh',       '吳杏玫 / Cody',                   2),
  (8, 1, 3, 'Julie Hsieh / Jerry Chiu',      'Martin Hsieh / 李佩安',           2),
  -- round 3: Green (2) vs Yellow (3)
  (1, 2, 3, 'Andrew Liao / Fred Lin',        'Ching-Yen Shih / Yu Cheng',       3),
  (2, 2, 3, 'Hung-Ying Lin / Vincent Tseng', '鄧之彬 / Ronald Feng',            3),
  (3, 2, 3, 'Theo Pai / Christine Lin',      'Nate Raughley / Ramon Mangaser',  3),
  (4, 2, 3, 'Peichun Su / Alice Liu',        'Thomas Yan / Andy Chung',         3),
  (5, 2, 3, 'Shih-Yen Pan / Janice Chen',    'Ben Chen / Tony Peng',            3),
  (6, 2, 3, 'Daniel Tiedemann / Chih-Yu Lee','Faye Chang / David Fang',         3),
  (7, 2, 3, 'Andy Lu / Zane Shao',           '吳杏玫 / Cody',                   3),
  (8, 2, 3, 'Margot Lai / Grace Shih',       'Martin Hsieh / 李佩安',           3)
) as m(sort_order, team_a_id, team_b_id, pair_a, pair_b, round)
join lines l on l.sort_order = m.sort_order;
