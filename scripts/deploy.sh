#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Deploy do Estúdio de Conteúdo CS — Supabase (backend) + Vercel (front-end).
# Roda LOCALMENTE ou num CI. Idempotente. Não hardcoda segredos: tudo vem do
# ambiente. Usa os CLIs via npx (não precisa instalar globalmente).
#
# Variáveis (obrigatórias marcadas com *):
#   Supabase:
#     * SUPABASE_ACCESS_TOKEN     token pessoal do Supabase (para os CLIs)
#     * SUPABASE_PROJECT_REF      ref do projeto (ex.: abcdxyz)
#     * SUPABASE_DB_PASSWORD      senha do banco (para `db push`)
#       SUPABASE_URL              url do projeto (para subir assets) — ou VITE_SUPABASE_URL
#       SUPABASE_SERVICE_ROLE_KEY para subir os assets da marca ao bucket
#     Secrets das functions (setados se presentes):
#       ANTHROPIC_API_KEY IG_USER_ID META_LONG_LIVED_TOKEN META_APP_ID META_APP_SECRET
#   Vercel:
#     * VERCEL_TOKEN
#     * VERCEL_ORG_ID
#     * VERCEL_PROJECT_ID
#   Opcional:
#       BRAND_ASSETS_DIR          pasta com os .ttf/.png da marca (padrão ./brand-assets)
#       SKIP_SUPABASE=1 / SKIP_VERCEL=1  pula uma das metades
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

log()  { printf '\033[1;33m▸ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
have() { [ -n "${!1:-}" ]; }

require() { for v in "$@"; do have "$v" || die "Variável obrigatória ausente: $v"; done; }

BRAND_ASSETS_DIR="${BRAND_ASSETS_DIR:-brand-assets}"

# ── Supabase ─────────────────────────────────────────────────────────────────
deploy_supabase() {
  require SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF SUPABASE_DB_PASSWORD
  export SUPABASE_ACCESS_TOKEN
  local sb="npx --yes supabase@latest"

  log "Supabase: link do projeto ${SUPABASE_PROJECT_REF}"
  $sb link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

  log "Supabase: aplicando migrações (db push)"
  $sb db push --password "$SUPABASE_DB_PASSWORD"

  # Secrets das Edge Functions — só os que estiverem no ambiente.
  local secrets=()
  for k in ANTHROPIC_API_KEY IG_USER_ID META_LONG_LIVED_TOKEN META_APP_ID META_APP_SECRET; do
    have "$k" && secrets+=("$k=${!k}")
  done
  if [ ${#secrets[@]} -gt 0 ]; then
    log "Supabase: setando ${#secrets[@]} secret(s) das functions"
    $sb secrets set "${secrets[@]}" --project-ref "$SUPABASE_PROJECT_REF"
  else
    log "Supabase: nenhum secret de function no ambiente (pulado)"
  fi

  # Assets da marca → bucket brand (se houver a pasta e a service key).
  if [ -d "$BRAND_ASSETS_DIR" ] && have SUPABASE_SERVICE_ROLE_KEY; then
    log "Supabase: subindo assets da marca de ${BRAND_ASSETS_DIR}"
    SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:-}}" \
    SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
      node scripts/upload-brand.mjs "$BRAND_ASSETS_DIR"
  else
    log "Supabase: assets da marca não enviados (pasta ${BRAND_ASSETS_DIR} ou service key ausente)"
  fi

  log "Supabase: deploy das Edge Functions"
  $sb functions deploy generate-carousel render-slides compliance-review publish-due-posts \
    --project-ref "$SUPABASE_PROJECT_REF"

  printf '\033[1;32m✔ Supabase pronto.\033[0m\n'
  echo "  Lembre-se dos segredos do Vault (cron), definidos UMA vez fora da migração:"
  echo "    select vault.create_secret('<service_role_key>','service_role_key');"
  echo "    select vault.create_secret('https://${SUPABASE_PROJECT_REF}.functions.supabase.co','functions_base_url');"
}

# ── Vercel ───────────────────────────────────────────────────────────────────
deploy_vercel() {
  require VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID
  export VERCEL_ORG_ID VERCEL_PROJECT_ID
  local vc="npx --yes vercel@latest"
  local target="${1:-production}"

  log "Vercel: pull da config (${target})"
  $vc pull --yes --environment="$target" --token="$VERCEL_TOKEN"

  log "Vercel: build"
  if [ "$target" = "production" ]; then
    $vc build --prod --token="$VERCEL_TOKEN"
    log "Vercel: deploy (produção)"
    $vc deploy --prebuilt --prod --token="$VERCEL_TOKEN"
  else
    $vc build --token="$VERCEL_TOKEN"
    log "Vercel: deploy (preview)"
    $vc deploy --prebuilt --token="$VERCEL_TOKEN"
  fi
  printf '\033[1;32m✔ Vercel pronto.\033[0m\n'
}

main() {
  [ "${SKIP_SUPABASE:-0}" = "1" ] || deploy_supabase
  [ "${SKIP_VERCEL:-0}" = "1" ]   || deploy_vercel "${1:-production}"
  printf '\n\033[1;32m✔ Deploy concluído.\033[0m\n'
}

main "$@"
