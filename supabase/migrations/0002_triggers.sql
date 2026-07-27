-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS OBRIGATÓRIOS (§5) — invariantes de banco, não regra de aplicação.
-- O portão de conformidade não pode ser contornável por edição tardia.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. INVALIDAÇÃO: editar conteúdo de post approved|scheduled → rebaixa p/ draft.
create or replace function invalidate_post(p_post_id uuid) returns void
  language plpgsql as $$
begin
  update posts
     set status = 'draft', scheduled_at = null
   where id = p_post_id and status in ('approved','scheduled');
  -- só reabre flags se houve, de fato, rebaixamento (post estava aprovado/agendado)
  if found then
    update compliance_flags set resolved = false where post_id = p_post_id;
  end if;
end $$;

create or replace function trg_invalidate_on_slide_edit() returns trigger
  language plpgsql as $$
begin
  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.eyebrow is distinct from old.eyebrow
     or new.citation is distinct from old.citation
     or new.template is distinct from old.template then
    perform invalidate_post(new.post_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_invalidate_on_edit on slides;
create trigger trg_invalidate_on_edit
  after update of title, body, eyebrow, citation, template on slides
  for each row execute function trg_invalidate_on_slide_edit();

create or replace function trg_invalidate_on_caption_edit() returns trigger
  language plpgsql as $$
begin
  -- roda ANTES do rebaixamento no próprio registro: se a caption mudou e o post
  -- estava approved|scheduled, rebaixa aqui mesmo e reabre as flags.
  if new.caption is distinct from old.caption
     and old.status in ('approved','scheduled') then
    new.status := 'draft';
    new.scheduled_at := null;
    update compliance_flags set resolved = false where post_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists trg_invalidate_on_caption on posts;
create trigger trg_invalidate_on_caption
  before update of caption on posts
  for each row execute function trg_invalidate_on_caption_edit();

-- ── 2. VERIFICAÇÃO FIXADA AO TEXTO: se raw_text mudar, a verificação cai (§5).
create or replace function trg_unverify_citation() returns trigger
  language plpgsql as $$
begin
  if new.raw_text is distinct from old.raw_text then
    new.verified := false;
    new.verified_at := null;
    new.text_hash := md5(new.raw_text);
  end if;
  return new;
end $$;

drop trigger if exists trg_unverify_on_text_change on citations;
create trigger trg_unverify_on_text_change
  before update on citations
  for each row execute function trg_unverify_citation();

-- Garante que verificação exige nota de fonte (§6.3): não dá para marcar
-- verified=true com source_note vazia.
create or replace function trg_citation_requires_source() returns trigger
  language plpgsql as $$
begin
  if new.verified and coalesce(btrim(new.source_note), '') = '' then
    raise exception 'Citação verificada exige nota de fonte (source_note).';
  end if;
  if new.verified and not old.verified then
    new.verified_at := now();
    new.text_hash := md5(new.raw_text);
  end if;
  return new;
end $$;

drop trigger if exists trg_citation_source on citations;
create trigger trg_citation_source
  before update on citations
  for each row execute function trg_citation_requires_source();

-- ── 3. PORTÃO DE TRÂNSITO: recusa transição para 'scheduled' se houver pendência.
create or replace function trg_gate_schedule_fn() returns trigger
  language plpgsql as $$
declare
  n_unverified int;
  n_blocks int;
  n_norender int;
begin
  if new.status = 'scheduled' and old.status is distinct from 'scheduled' then
    select count(*) into n_unverified
      from citations where post_id = new.id and verified = false;
    if n_unverified > 0 then
      raise exception 'Não é possível agendar: % citação(ões) ainda não verificada(s).', n_unverified;
    end if;

    select count(*) into n_blocks
      from compliance_flags
     where post_id = new.id and severity = 'block' and resolved = false;
    if n_blocks > 0 then
      raise exception 'Não é possível agendar: % alerta(s) bloqueante(s) em aberto.', n_blocks;
    end if;

    select count(*) into n_norender
      from slides where post_id = new.id and rendered_url is null;
    if n_norender > 0 then
      raise exception 'Não é possível agendar: % slide(s) sem imagem renderizada.', n_norender;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_gate_schedule on posts;
create trigger trg_gate_schedule
  before update of status on posts
  for each row execute function trg_gate_schedule_fn();
