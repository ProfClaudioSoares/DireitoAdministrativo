-- Claim atômico dos posts vencidos (§10). FOR UPDATE SKIP LOCKED evita que dois
-- ciclos de cron que se sobreponham peguem a mesma linha. A idempotência real da
-- publicação, porém, é garantida pelos container ids persistidos (§10).
create or replace function claim_due_posts(p_limit int default 5)
  returns setof posts
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  return query
    select *
      from posts
     where status = 'scheduled'
       and scheduled_at <= now()
     order by scheduled_at asc
     limit p_limit
     for update skip locked;
end $$;
