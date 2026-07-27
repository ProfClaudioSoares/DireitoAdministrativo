-- Fase 2: templates com imagem (T8/T9).
-- 1) coluna para o caminho da imagem do slide no Storage
alter table slides add column if not exists image_url text;

-- 2) libera os ids T8 e T9 (mantendo T1–T7)
alter table slides drop constraint if exists slides_template_check;
alter table slides
  add constraint slides_template_check
  check (template in ('T1','T2','T3','T4','T5','T6','T7','T8','T9'));

-- 3) bucket privado para as imagens que o titular subir
insert into storage.buckets (id, name, public)
values ('slide-images', 'slide-images', false)
on conflict (id) do nothing;

-- 4) acesso do usuário autenticado (app de dono único)
drop policy if exists slide_images_auth on storage.objects;
create policy slide_images_auth on storage.objects for all to authenticated
  using (bucket_id = 'slide-images')
  with check (bucket_id = 'slide-images');
