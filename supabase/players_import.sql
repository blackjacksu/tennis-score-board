-- 2026 TAA Tennis Event — player roster import (47 players).
-- Run AFTER schema.sql and seed.sql (needs the Red / Green / Yellow teams to exist).
-- Team is resolved by NAME (not a hardcoded id) so it survives any re-seed.
--
-- 49 sign-ups − 2 dropouts (Jady Tsao, Dylon Lo) = 47 players.
--   * Registered partners kept together; remaining solos paired by nearest combined NTRP.
--   * Ramon Mangaser paired with Nate Raughley (matching 3.5); Daniel Tiedemann re-paired.
--   * 吳杏玫 seeded at 2.5 (no rating on the form); 鄧之彬 at 4.0 as registered.
--   * Willy Su plays double-duty (Red Line 1 + Line 3) to fill the 48th pair-slot;
--     he is listed once here as a Red player.
--   * Team combined-NTRP totals: Red 52.5 · Green 52.0 · Yellow 52.0.

insert into players (team_id, name, ntrp)
select t.id, v.name, v.ntrp
from (values
  -- ===== RED (紅隊) — 15 players, Willy Su doubles on Lines 1 & 3 =====
  ('Red',    'Richard Lin',      4.5),  -- Line 1
  ('Red',    'Willy Su',         4.0),  -- Line 1 & Line 3 (double-duty; 蘇亭瑋)
  ('Red',    'Kevin Chiang',     4.0),  -- Line 2
  ('Red',    'Yi-Chih Wang',     4.0),  -- Line 2
  ('Red',    'Mu-Ting Chien',    3.5),  -- Line 3
  ('Red',    'Wendy Wang',       3.0),  -- Line 4
  ('Red',    '楊之安',            3.5),  -- Line 4
  ('Red',    'Derrick Chueh',    3.5),  -- Line 5
  ('Red',    'Tim Chen',         3.0),  -- Line 5
  ('Red',    'Chris Lin',        3.0),  -- Line 6
  ('Red',    'Joshua Lee',       3.0),  -- Line 6
  ('Red',    'Andy Chen',        2.5),  -- Line 7
  ('Red',    'Avery Hsieh',      2.5),  -- Line 7
  ('Red',    'Julie Hsieh',      2.5),  -- Line 8
  ('Red',    'Jerry Chiu',       2.0),  -- Line 8

  -- ===== GREEN (綠隊) — 16 players =====
  ('Green',  'Andrew Liao',      4.5),  -- Line 1
  ('Green',  'Fred Lin',         4.5),  -- Line 1
  ('Green',  'Hung-Ying Lin',    4.0),  -- Line 2
  ('Green',  'Vincent Tseng',    4.0),  -- Line 2
  ('Green',  'Theo Pai',         3.5),  -- Line 3  (Chingyuan "Theo" Pai)
  ('Green',  'Christine Lin',    3.5),  -- Line 3
  ('Green',  'Peichun Su',       3.5),  -- Line 4  (partner Dylon Lo dropped)
  ('Green',  'Alice Liu',        3.5),  -- Line 4
  ('Green',  'Shih-Yen Pan',     3.5),  -- Line 5
  ('Green',  'Janice Chen',      3.0),  -- Line 5  (Yu-Zhen "Janice" Chen)
  ('Green',  'Daniel Tiedemann', 3.0),  -- Line 6
  ('Green',  'Chih-Yu Lee',      3.0),  -- Line 6
  ('Green',  'Andy Lu',          3.0),  -- Line 7
  ('Green',  'Zane Shao',        2.5),  -- Line 7
  ('Green',  'Margot Lai',       1.5),  -- Line 8
  ('Green',  'Grace Shih',       1.5),  -- Line 8

  -- ===== YELLOW (黃隊) — 16 players =====
  ('Yellow', 'Ching-Yen Shih',   4.0),  -- Line 1  (施慶延)
  ('Yellow', 'Yu Cheng',         4.0),  -- Line 1
  ('Yellow', '鄧之彬',            4.0),  -- Line 2  (registered 4.0; husband competes)
  ('Yellow', 'Ronald Feng',      4.0),  -- Line 2
  ('Yellow', 'Nate Raughley',    3.5),  -- Line 3
  ('Yellow', 'Ramon Mangaser',   3.5),  -- Line 3
  ('Yellow', 'Thomas Yan',       3.5),  -- Line 4
  ('Yellow', 'Andy Y.',          3.5),  -- Line 4  (Andy / iamyuanchung)
  ('Yellow', 'Ben Chen',         3.5),  -- Line 5
  ('Yellow', 'Tony Peng',        3.0),  -- Line 5  (Shiuan-Tung "Tony" Peng)
  ('Yellow', 'Faye Chang',       3.0),  -- Line 6
  ('Yellow', 'David Fang',       3.0),  -- Line 6
  ('Yellow', 'Martin Hsieh',     2.5),  -- Line 7
  ('Yellow', 'Cody',             2.5),  -- Line 7
  ('Yellow', '吳杏玫',            2.5),  -- Line 8  (no rating on form; seeded 2.5)
  ('Yellow', '李佩安',            2.0)   -- Line 8  (Pei-An Li)
) as v(team_name, name, ntrp)
join teams t on t.name = v.team_name;
