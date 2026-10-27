-- Historique des carrières : chaque carrière terminée sur un compte y est gardée.
--
-- Le Panthéon de l'appareil n'en garde que les 20 dernières (et le navigateur
-- plafonne son stockage) : ici, une ligne par carrière, jusqu'à 1000 par compte.
-- Au-delà, les plus anciennes partent, sauf les favorites.
--
--   client_id : identifiant donné par l'appareil à la fin de la carrière. Un même
--               envoi répété (réseau coupé, second appareil restauré) ne crée pas
--               de doublon.
--   summary   : ce qu'affiche la liste (nom, titre, drapeau, trophées…), sans
--               avoir à relire la carrière entière ;
--   data      : l'instantané complet, pour rouvrir la fiche finale.
create table careers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  client_id text not null,
  mode text not null check (mode in ('career', 'daily', 'duel', 'story', 'room')),
  summary jsonb not null,
  data jsonb not null,
  score integer not null default 0,
  favorite boolean not null default false,
  played_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index careers_user_played on careers (user_id, played_at desc, id desc);

-- Carrières supprimées par le joueur. Un autre appareil peut encore les avoir dans son
-- Panthéon et les renvoyer : on s'en souvient pour ne pas les faire réapparaître.
create table careers_deleted (
  user_id uuid not null references users(id) on delete cascade,
  client_id text not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
