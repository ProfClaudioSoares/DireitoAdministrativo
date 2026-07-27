#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cria o projeto Supabase e configura tudo, usando o SEU token pessoal.
# Rode LOCALMENTE (na sua máquina/Cloud Shell), onde a rede alcança o Supabase.
#
# Requer:  SUPABASE_ACCESS_TOKEN   (token pessoal — https://supabase.com/dashboard/account/tokens)
# Passos:  1º rode sem SUPABASE_ORG_ID para listar suas orgs; depois defina-a e rode de novo.
#
# Variáveis:
#   SUPABASE_ACCESS_TOKEN *  token pessoal
#   SUPABASE_ORG_ID          id da organização (o script lista se faltar)
#   PROJECT_NAME             padrão: estudio-conteudo-cs
#   REGION                   padrão: sa-east-1 (São Paulo)
#   DB_PASSWORD              se vazio, gera uma forte e imprime
#   SUPABASE_PROJECT_REF     pule a criação e use um projeto já existente
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
log(){ printf '\033[1;33m▸ %s\033[0m\n' "$*"; }
die(){ printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -n "${SUPABASE_ACCESS_TOKEN:-}" ] || die "Defina SUPABASE_ACCESS_TOKEN (seu token pessoal do Supabase)."
export SUPABASE_ACCESS_TOKEN
SB="npx --yes supabase@latest"
NAME="${PROJECT_NAME:-estudio-conteudo-cs}"
REGION="${REGION:-sa-east-1}"

if [ -z "${SUPABASE_ORG_ID:-}" ] && [ -z "${SUPABASE_PROJECT_REF:-}" ]; then
  log "Suas organizações (copie o id e rode de novo com SUPABASE_ORG_ID=<id>):"
  $SB orgs list
  exit 0
fi

REF="${SUPABASE_PROJECT_REF:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
[ -n "$DB_PASSWORD" ] || DB_PASSWORD="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"

if [ -z "$REF" ]; then
  log "Criando projeto '$NAME' em '$REGION'…"
  $SB projects create "$NAME" --org-id "$SUPABASE_ORG_ID" --db-password "$DB_PASSWORD" --region "$REGION"
  log "Descobrindo o ref do projeto…"
  REF="$($SB projects list -o json | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
      try{const a=JSON.parse(s);const p=a.find(x=>x.name===process.argv[1]);
      process.stdout.write((p&&(p.id||p.ref))||"")}catch{ process.exit(0) }})' "$NAME")"
  [ -n "$REF" ] || die "Não consegui obter o ref automaticamente. Rode: npx supabase projects list"
fi

log "Projeto ref: $REF"
log "URL:  https://$REF.supabase.co"
log "GUARDE a senha do banco: $DB_PASSWORD"
log "Chaves de API (anon = VITE_SUPABASE_ANON_KEY; service_role = servidor/Vault):"
$SB projects api-keys --project-ref "$REF" || true

log "Linkando e aplicando as migrações…"
$SB link --project-ref "$REF" --password "$DB_PASSWORD"
$SB db push --password "$DB_PASSWORD"

log "Deploy das Edge Functions…"
$SB functions deploy generate-carousel render-slides compliance-review publish-due-posts mixpost-schedule \
  --project-ref "$REF"

cat <<EOF

✔ Projeto criado e migrado. Faça agora (uma vez):

1) Secrets das functions (IA + Meta):
   supabase secrets set ANTHROPIC_API_KEY=… IG_USER_ID=… META_APP_ID=… META_APP_SECRET=… META_LONG_LIVED_TOKEN=… --project-ref $REF

2) Vault (cron) — no SQL Editor do painel:
   select vault.create_secret('<service_role_key>','service_role_key');
   select vault.create_secret('https://$REF.functions.supabase.co','functions_base_url');

3) Assets da marca (4 .ttf + 3 PNGs em ./brand-assets):
   SUPABASE_URL=https://$REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role> node scripts/upload-brand.mjs ./brand-assets

4) Vercel — variáveis do projeto:
   VITE_SUPABASE_URL=https://$REF.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key impressa acima>
   VITE_PUBLISH_PROVIDER=meta
EOF
