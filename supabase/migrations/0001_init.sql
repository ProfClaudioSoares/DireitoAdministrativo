-- ═══════════════════════════════════════════════════════════════════════════
-- Estúdio de Conteúdo CS · schema inicial (§5)
-- Usuário único (o titular), mas nenhuma tabela fica aberta: RLS por owner_id.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabelas ────────────────────────────────────────────────────────────────

create table if not exists posts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) default auth.uid(),
  title         text not null,
  pillar        text not null check (pillar in
                  ('artigo_semana','erro_certame','decisao_comentada',
                   'pergunta_licitante','bastidores')),
  status        text not null default 'draft' check (status in
                  ('draft','review','blocked','approved','scheduled','published','failed')),
  caption       text,
  hashtags      text[],
  scheduled_at  timestamptz,
  published_at  timestamptz,
  ig_media_id   text,
  ig_parent_container_id text,   -- idempotência da publicação (§10)
  ig_child_container_ids text[], -- idem
  error_message text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table if not exists slides (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) default auth.uid(),
  post_id      uuid not null references posts(id) on delete cascade,
  position     int not null,
  template     text not null check (template in ('T1','T2','T3','T4','T5')),
  eyebrow      text,
  title        text,
  body         text,
  citation     text,
  alt_text     text,
  rendered_url text,
  unique (post_id, position) deferrable initially deferred  -- reordenar sem colisão
);

create table if not exists citations (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) default auth.uid(),
  post_id      uuid not null references posts(id) on delete cascade,
  slide_id     uuid references slides(id) on delete cascade,
  raw_text     text not null,          -- "art. 164 da Lei 14.133/2021"
  text_hash    text not null,          -- md5(raw_text) no momento da verificação
  kind         text not null check (kind in ('dispositivo','acordao','sumula','outro')),
  verified     boolean not null default false,
  verified_at  timestamptz,
  source_note  text                    -- onde o titular conferiu
);

create table if not exists compliance_flags (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid not null references auth.users(id) default auth.uid(),
  post_id   uuid not null references posts(id) on delete cascade,
  rule      text not null,
  layer     text not null check (layer in ('regex','ia')),
  severity  text not null check (severity in ('block','warn')),
  excerpt   text not null,
  rationale text not null,
  resolved  boolean not null default false,
  resolution_note text
);

create table if not exists pauta (
  id        uuid primary key default gen_random_uuid(),
  owner_id  uuid not null references auth.users(id) default auth.uid(),
  topic     text not null,
  pillar    text not null,
  notes     text,
  used_at   timestamptz
);

create table if not exists publish_attempts (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references posts(id) on delete cascade,
  attempt_no  int not null,
  step        text not null,   -- 'child'|'parent'|'publish'|'comment'
  ok          boolean not null,
  payload     jsonb,
  created_at  timestamptz default now()
);

-- ── updated_at automático ────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_posts_updated_at on posts;
create trigger trg_posts_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS (§5): ativa em todas as tabelas; owner_id = auth.uid() em todos os verbos.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['posts','slides','citations','compliance_flags','pauta']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I_owner on %I;', t, t);
    execute format(
      'create policy %I_owner on %I for all
         using (owner_id = auth.uid())
         with check (owner_id = auth.uid());', t, t);
  end loop;
end $$;

-- publish_attempts não tem owner_id (auditoria via post). Restringe pelo dono do post.
alter table publish_attempts enable row level security;
drop policy if exists publish_attempts_owner on publish_attempts;
create policy publish_attempts_owner on publish_attempts for all
  using (exists (select 1 from posts p where p.id = post_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from posts p where p.id = post_id and p.owner_id = auth.uid()));
