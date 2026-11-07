-- Ranked : rang de chaque joueur, nourri par les étoiles du défi du jour.
--
-- Seule la PREMIÈRE partie du jour compte : /api/ranked/start ouvre une ligne
-- « started » (avec un jeton) ; la fin de cette partie, envoyée avec le même jeton,
-- la passe à « done » avec ses étoiles, recalculées par le serveur. Une partie
-- commencée puis abandonnée est soldée à 0 étoile au prochain départ (« forfeit »).
-- Les règles de montée et descente vivent dans le moteur (engine/stars.ts) : la base
-- ne fait que garder l'état.

create table ranked (
  user_id     uuid primary key references users(id) on delete cascade,
  season      text,                       -- « AAAA-MM »
  tier        int  not null default 0,    -- 0 Bronze → 5 Légende
  div         int  not null default 0,    -- 0 = III, 1 = II, 2 = I (0 en Légende)
  points      int  not null default 0,
  protect     int  not null default 0,
  best_tier   int  not null default 0,
  best_div    int  not null default 0,
  last_date   text,
  pseudo      text,
  updated_at  timestamptz not null default now()
);
create index ranked_board on ranked (season, tier desc, div desc, points desc);

create table ranked_days (
  user_id     uuid not null references users(id) on delete cascade,
  date        text not null,
  token       uuid not null default gen_random_uuid(),
  status      text not null default 'started' check (status in ('started', 'done', 'forfeit')),
  stars       int,
  delta       int,
  tier        int,
  div         int,
  points      int,
  created_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- Meilleur rang atteint à chaque saison close (badge de saison sur le profil).
create table ranked_seasons (
  user_id    uuid not null references users(id) on delete cascade,
  season     text not null,
  best_tier  int  not null,
  best_div   int  not null,
  primary key (user_id, season)
);
