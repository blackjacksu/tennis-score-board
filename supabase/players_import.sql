-- 2026 TAA Tennis Event — player roster import (48 players).
-- GENERATED from lib/demoData.ts by scripts/gen-seed.mjs — do not edit by hand.
-- Run AFTER schema.sql and seed.sql. Team resolved by NAME (survives re-seed).

insert into players (team_id, name, ntrp)
select t.id, v.name, v.ntrp
from (values
  -- ===== RED (紅隊) — captain Willy Su =====
  ('Red'   , 'Richard Lin'     , 4.5),  -- Line 1
  ('Red'   , 'Willy Su'        , 4.0),  -- Line 1
  ('Red'   , 'Kevin Chiang'    , 4.0),  -- Line 2
  ('Red'   , 'Yi-Chih Wang'    , 4.0),  -- Line 2
  ('Red'   , 'Mu-Ting Chien'   , 3.5),  -- Line 3
  ('Red'   , 'Kosho Horage'    , 3.5),  -- Line 3
  ('Red'   , 'Wendy Wang'      , 3.0),  -- Line 4
  ('Red'   , '楊之安'          , 3.5),  -- Line 4
  ('Red'   , 'Derrick Chueh'   , 3.5),  -- Line 5
  ('Red'   , 'Tim Chen'        , 3.0),  -- Line 5
  ('Red'   , 'Chris Lin'       , 3.0),  -- Line 6
  ('Red'   , 'Joshua Lee'      , 3.0),  -- Line 6
  ('Red'   , 'David Fang'      , 3.0),  -- Line 7
  ('Red'   , 'Cody'            , 2.5),  -- Line 7
  ('Red'   , 'Margot Lai'      , 1.5),  -- Line 8
  ('Red'   , 'Grace Shih'      , 1.5),  -- Line 8
  -- ===== GREEN (綠隊) — captain Ben Chen =====
  ('Green' , 'Andrew Liao'     , 4.5),  -- Line 1
  ('Green' , 'Fred Lin'        , 4.5),  -- Line 1
  ('Green' , '鄧之彬'          , 4.0),  -- Line 2
  ('Green' , 'Ronald Feng'     , 4.0),  -- Line 2
  ('Green' , 'Peichun Su'      , 3.5),  -- Line 3
  ('Green' , 'Thomas Yan'      , 3.5),  -- Line 3
  ('Green' , 'Alice Liu'       , 3.5),  -- Line 4
  ('Green' , 'Andy Chung'      , 3.5),  -- Line 4
  ('Green' , 'Faye Chang'      , 3.0),  -- Line 5
  ('Green' , '吳杏玫'          , 3.5),  -- Line 5
  ('Green' , 'Ben Chen'        , 3.5),  -- Line 6
  ('Green' , 'Tony Peng'       , 3.0),  -- Line 6
  ('Green' , 'Andy Chen'       , 2.5),  -- Line 7
  ('Green' , 'Avery Hsieh'     , 2.5),  -- Line 7
  ('Green' , 'Julie Hsieh'     , 2.5),  -- Line 8
  ('Green' , 'Jerry Chiu'      , 2.0),  -- Line 8
  -- ===== YELLOW (黃隊) — captain Yu Cheng =====
  ('Yellow', 'Ching-Yen Shih'  , 4.0),  -- Line 1
  ('Yellow', 'Yu Cheng'        , 4.0),  -- Line 1
  ('Yellow', 'Hung-Ying Lin'   , 4.0),  -- Line 2
  ('Yellow', 'Vincent Tseng'   , 4.0),  -- Line 2
  ('Yellow', 'Theo Pai'        , 3.5),  -- Line 3
  ('Yellow', 'Christine Lin'   , 3.5),  -- Line 3
  ('Yellow', 'Nate Raughley'   , 3.5),  -- Line 4
  ('Yellow', 'Ramon Mangaser'  , 3.5),  -- Line 4
  ('Yellow', 'Shih-Yen Pan'    , 3.5),  -- Line 5
  ('Yellow', 'Janice Chen'     , 3.0),  -- Line 5
  ('Yellow', 'Daniel Tiedemann', 3.0),  -- Line 6
  ('Yellow', 'Chih-Yu Lee'     , 3.0),  -- Line 6
  ('Yellow', 'Andy Lu'         , 3.0),  -- Line 7
  ('Yellow', 'Zane Shao'       , 2.5),  -- Line 7
  ('Yellow', 'Martin Hsieh'    , 2.5),  -- Line 8
  ('Yellow', '李佩安'          , 2.0)  -- Line 8
) as v(team_name, name, ntrp)
join teams t on t.name = v.team_name;
