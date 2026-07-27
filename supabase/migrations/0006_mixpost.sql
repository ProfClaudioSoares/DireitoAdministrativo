-- ═══════════════════════════════════════════════════════════════════════════
-- Integração com o Mixpost (agendador). O Mixpost recebe os PNGs + legenda e
-- publica no Instagram no horário. Guardamos os identificadores do Mixpost para
-- idempotência: retentativa reaproveita a mídia e o post já criados, sem duplicar.
-- ═══════════════════════════════════════════════════════════════════════════
alter table posts
  add column if not exists mixpost_post_uuid text,
  add column if not exists mixpost_media_ids text[];
