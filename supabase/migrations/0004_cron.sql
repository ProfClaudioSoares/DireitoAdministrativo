-- ═══════════════════════════════════════════════════════════════════════════
-- Agendamento (§2/§10): pg_cron + pg_net disparam `publish-due-posts` a cada
-- 5 minutos. ⚠ A service_role key usada pelo cron vive no Supabase Vault,
-- NUNCA em texto plano na definição do job (§12 critério 8).
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Pré-requisito (rode uma vez, fora da migração, para não versionar segredos):
--   select vault.create_secret('<service_role_key>', 'service_role_key');
--   select vault.create_secret('https://<ref>.functions.supabase.co', 'functions_base_url');

-- Função que lê os segredos do Vault e chama a Edge Function.
create or replace function invoke_publish_due_posts() returns void
  language plpgsql
  security definer
  set search_path = public, vault
as $$
declare
  v_key text;
  v_base text;
begin
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'service_role_key';
  select decrypted_secret into v_base
    from vault.decrypted_secrets where name = 'functions_base_url';

  if v_key is null or v_base is null then
    raise warning 'Segredos do Vault ausentes (service_role_key / functions_base_url).';
    return;
  end if;

  perform net.http_post(
    url     := v_base || '/publish-due-posts',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || v_key),
    body    := '{}'::jsonb
  );
end $$;

-- Agenda a cada 5 minutos. Remove agendamento anterior de mesmo nome.
select cron.unschedule('publish-due-posts')
  where exists (select 1 from cron.job where jobname = 'publish-due-posts');

select cron.schedule('publish-due-posts', '*/5 * * * *', $$select invoke_publish_due_posts();$$);
