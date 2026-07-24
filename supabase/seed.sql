-- 2026 TAA Tennis Event seed: 3 teams, 8 lines,
-- round-robin ties => 24 matches.
-- GENERATED from lib/demoData.ts by scripts/gen-seed.mjs — do not edit by hand.
-- Run AFTER schema.sql in the Supabase SQL Editor, then run players_import.sql.
-- Re-runnable: clears existing rows first.

truncate matches, players, lines, teams restart identity cascade;

insert into teams (name, name_zh, color) values
  ('Red', '紅隊', '#ef4444'),
  ('Green', '綠隊', '#22c55e'),
  ('Yellow', '黃隊', '#eab308');

insert into lines (label, ntrp, sort_order) values
  ('Line 1', '8.0–9.0', 1),
  ('Line 2', '8.0', 2),
  ('Line 3', '7.0', 3),
  ('Line 4', '6.5–7.0', 4),
  ('Line 5', '6.5', 5),
  ('Line 6', '5.5–6.0', 6),
  ('Line 7', '5.0–5.5', 7),
  ('Line 8', '3.0–4.5', 8);

insert into matches (line_id, team_a_id, team_b_id, pair_a, pair_b, round)
select l.id, m.team_a_id, m.team_b_id, m.pair_a, m.pair_b, m.round
from (values
  -- round 1: Red (1) vs Green (2)
  (1, 1, 2, 'Richard Lin / Willy Su'        , 'Andrew Liao / Fred Lin'        , 1),
  (2, 1, 2, 'Kevin Chiang / Yi-Chih Wang'   , '鄧之彬 / Ronald Feng'          , 1),
  (3, 1, 2, 'Mu-Ting Chien / Kosho Horage'  , 'Peichun Su / Thomas Yan'       , 1),
  (4, 1, 2, 'Wendy Wang / 楊之安'           , 'Alice Liu / Andy Chung'        , 1),
  (5, 1, 2, 'Derrick Chueh / Tim Chen'      , 'Ben Chen / Tony Peng'          , 1),
  (6, 1, 2, 'Chris Lin / Joshua Lee'        , 'Andy Lu / Zane Shao'           , 1),
  (7, 1, 2, 'Andy Chen / Avery Hsieh'       , 'David Fang / Cody'             , 1),
  (8, 1, 2, 'Margot Lai / Grace Shih'       , 'Julie Hsieh / Jerry Chiu'      , 1),
  -- round 2: Red (1) vs Yellow (3)
  (1, 1, 3, 'Richard Lin / Willy Su'        , 'Ching-Yen Shih / Yu Cheng'     , 2),
  (2, 1, 3, 'Kevin Chiang / Yi-Chih Wang'   , 'Hung-Ying Lin / Vincent Tseng' , 2),
  (3, 1, 3, 'Mu-Ting Chien / Kosho Horage'  , 'Theo Pai / Christine Lin'      , 2),
  (4, 1, 3, 'Wendy Wang / 楊之安'           , 'Nate Raughley / Ramon Mangaser', 2),
  (5, 1, 3, 'Derrick Chueh / Tim Chen'      , 'Shih-Yen Pan / Janice Chen'    , 2),
  (6, 1, 3, 'Chris Lin / Joshua Lee'        , 'Daniel Tiedemann / Chih-Yu Lee', 2),
  (7, 1, 3, 'Andy Chen / Avery Hsieh'       , 'Faye Chang / 吳杏玫'           , 2),
  (8, 1, 3, 'Margot Lai / Grace Shih'       , 'Martin Hsieh / 李佩安'         , 2),
  -- round 3: Green (2) vs Yellow (3)
  (1, 2, 3, 'Andrew Liao / Fred Lin'        , 'Ching-Yen Shih / Yu Cheng'     , 3),
  (2, 2, 3, '鄧之彬 / Ronald Feng'          , 'Hung-Ying Lin / Vincent Tseng' , 3),
  (3, 2, 3, 'Peichun Su / Thomas Yan'       , 'Theo Pai / Christine Lin'      , 3),
  (4, 2, 3, 'Alice Liu / Andy Chung'        , 'Nate Raughley / Ramon Mangaser', 3),
  (5, 2, 3, 'Ben Chen / Tony Peng'          , 'Shih-Yen Pan / Janice Chen'    , 3),
  (6, 2, 3, 'Andy Lu / Zane Shao'           , 'Daniel Tiedemann / Chih-Yu Lee', 3),
  (7, 2, 3, 'David Fang / Cody'             , 'Faye Chang / 吳杏玫'           , 3),
  (8, 2, 3, 'Julie Hsieh / Jerry Chiu'      , 'Martin Hsieh / 李佩安'         , 3)
) as m(sort_order, team_a_id, team_b_id, pair_a, pair_b, round)
join lines l on l.sort_order = m.sort_order;
