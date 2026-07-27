-- ═══════════════════════════════════════════════════════════════════════════
-- Storage (§4/§9): bucket `brand` (fontes .ttf + PNGs de marca) e `renders`.
-- `renders` é privado — o conteúdo é rascunho até publicar; a URL da Meta é
-- assinada com validade de 24h no momento da publicação (§9).
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('brand', 'brand', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('renders', 'renders', false)
on conflict (id) do nothing;

-- Acesso restrito ao usuário autenticado (app de dono único).
drop policy if exists brand_authenticated on storage.objects;
create policy brand_authenticated on storage.objects for all to authenticated
  using (bucket_id = 'brand')
  with check (bucket_id = 'brand');

drop policy if exists renders_authenticated on storage.objects;
create policy renders_authenticated on storage.objects for all to authenticated
  using (bucket_id = 'renders')
  with check (bucket_id = 'renders');
