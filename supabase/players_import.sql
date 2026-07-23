-- 2026 TAA Tennis Event — player roster import (45 players).
-- Run AFTER schema.sql and seed.sql (needs the Red / Green / Yellow teams to exist).
-- Team is resolved by NAME (not a hardcoded id) so it survives any re-seed.
--
-- Rules applied from the registration sheet:
--   * Excluded: Jady Tsao, Dylon Lo (dropped out); 吳杏玫 (no NTRP); 鄧之彬 (husband is the actual player).
--   * Registered partners kept together; remaining solos paired by nearest combined NTRP.
--   * Ramon Mangaser paired with Nate Raughley (matching 3.5); Daniel Tiedemann re-paired.
--   * Each team's combined NTRP total = 47.0 (balanced).
--   * ALT = alternate (odd-count leftovers, 1 per team, swappable into any line).

insert into players (team_id, name, ntrp)
select t.id, v.name, v.ntrp
from (values
  -- ===== RED (紅隊) =====
  ('Red',    'Andrew Liao',      4.5),  -- Line 1
  ('Red',    'Fred Lin',         4.5),  -- Line 1
  ('Red',    'Ronald Feng',      4.0),  -- Line 2
  ('Red',    'Mu-Ting Chien',    3.5),  -- Line 2
  ('Red',    'Theo Pai',         3.5),  -- Line 3  (Chingyuan "Theo" Pai)
  ('Red',    'Christine Lin',    3.5),  -- Line 3
  ('Red',    'Wendy Wang',       3.0),  -- Line 4
  ('Red',    '楊之安',            3.5),  -- Line 4
  ('Red',    'Derrick Chueh',    3.5),  -- Line 5
  ('Red',    'Tim Chen',         3.0),  -- Line 5
  ('Red',    'Andy Lu',          3.0),  -- Line 6
  ('Red',    'Zane Shao',        2.5),  -- Line 6
  ('Red',    'Andy Chen',        2.5),  -- Line 7
  ('Red',    'Avery Hsieh',      2.5),  -- Line 7
  ('Red',    'Margot Lai',       1.5),  -- ALT

  -- ===== GREEN (綠隊) =====
  ('Green',  'Richard Lin',      4.5),  -- Line 1
  ('Green',  'Willy Su',         4.0),  -- Line 1  (蘇亭瑋)
  ('Green',  'Hung-Ying Lin',    4.0),  -- Line 2
  ('Green',  'Vincent Tseng',    4.0),  -- Line 2
  ('Green',  'Nate Raughley',    3.5),  -- Line 3
  ('Green',  'Ramon Mangaser',   3.5),  -- Line 3
  ('Green',  'Shih-Yen Pan',     3.5),  -- Line 4
  ('Green',  'Janice Chen',      3.0),  -- Line 4  (Yu-Zhen "Janice" Chen)
  ('Green',  'Ben Chen',         3.5),  -- Line 5
  ('Green',  'Tony Peng',        3.0),  -- Line 5  (Shiuan-Tung "Tony" Peng)
  ('Green',  'Faye Chang',       3.0),  -- Line 6
  ('Green',  'David Fang',       3.0),  -- Line 6
  ('Green',  'Julie Hsieh',      2.5),  -- Line 7
  ('Green',  'Jerry Chiu',       2.0),  -- Line 7
  ('Green',  'Grace Shih',       1.5),  -- ALT

  -- ===== YELLOW (黃隊) =====
  ('Yellow', 'Ching-Yen Shih',   4.0),  -- Line 1  (施慶延)
  ('Yellow', 'Yu Cheng',         4.0),  -- Line 1
  ('Yellow', 'Kevin Chiang',     4.0),  -- Line 2
  ('Yellow', 'Yi-Chih Wang',     4.0),  -- Line 2
  ('Yellow', 'Peichun Su',       3.5),  -- Line 3
  ('Yellow', 'Alice Liu',        3.5),  -- Line 3
  ('Yellow', 'Thomas Yan',       3.5),  -- Line 4
  ('Yellow', 'Andy Y.',          3.5),  -- Line 4  (Andy / iamyuanchung)
  ('Yellow', 'Chris Lin',        3.0),  -- Line 5
  ('Yellow', 'Joshua Lee',       3.0),  -- Line 5
  ('Yellow', 'Daniel Tiedemann', 3.0),  -- Line 6
  ('Yellow', 'Chih-Yu Lee',      3.0),  -- Line 6
  ('Yellow', 'Martin Hsieh',     2.5),  -- Line 7
  ('Yellow', 'Cody',             2.5),  -- Line 7
  ('Yellow', '李佩安',            2.0)   -- ALT (Pei-An Li)
) as v(team_name, name, ntrp)
join teams t on t.name = v.team_name;
