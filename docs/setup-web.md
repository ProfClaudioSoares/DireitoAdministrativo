# Plano B — configurar o Supabase pelo painel web (sem CLI)

Guia clicável. **Parte 1** é 100% pelo dashboard e já deixa o app com login, dados,
edição e agenda funcionando. **Parte 2** (Edge Functions) liga a geração por IA, o
render em PNG, a conformidade e a publicação — essas exigem um passo de deploy
(CLI ou GitHub Action), explicado no fim, porque duas funções empacotam código
compartilhado de `src/`.

---

## Parte 1 — Painel web (sem CLI)

### 1. Criar o projeto
1. <https://supabase.com/dashboard> → **New project**.
2. Nome: `estudio-conteudo-cs` · Region: **South America (São Paulo)** · defina e
   **guarde a Database Password**.
3. Aguarde o provisionamento (~2 min).

### 2. Habilitar extensões (para o cron)
**Database → Extensions** → habilite: **`pg_cron`**, **`pg_net`**, **`supabase_vault`**.

### 3. Aplicar as migrações (SQL Editor)
**SQL Editor → New query**. Copie o conteúdo de cada arquivo abaixo, **nesta ordem**,
e clique **Run** (um por vez):

1. `supabase/migrations/0001_init.sql`  — tabelas + RLS
2. `supabase/migrations/0002_triggers.sql`  — triggers invariantes
3. `supabase/migrations/0003_storage.sql`  — buckets `brand` e `renders`
4. `supabase/migrations/0005_claim.sql`  — claim atômico do worker
5. `supabase/migrations/0006_mixpost.sql`  — colunas Mixpost (inócuo se usar Meta)
6. `supabase/migrations/0004_cron.sql`  — **por último** (agenda o cron)

> Rode o `0004` por último. Ele agenda a chamada ao worker; os segredos do Vault
> que ele usa são criados no passo 6.

### 4. Buckets e assets da marca
Os buckets `brand` e `renders` já foram criados pela migração `0003`.
Em **Storage → `brand` → Upload**, suba os arquivos (nomes exatos):
- Fontes: `PlayfairDisplay-Medium.ttf`, `PlayfairDisplay-MediumItalic.ttf`, `Jost-Light.ttf`, `Jost-Medium.ttf`
- Logos: `monogram-amber.png`, `monogram-dark.png`, `wordmark.png`

### 5. Chaves e URL do projeto
**Project Settings → API**: copie **Project URL** e a chave **anon public**.
Guarde também a **service_role** (só para servidor/Vault — nunca no cliente).

### 6. Autenticação
1. **Authentication → URL Configuration**: em **Site URL** e **Redirect URLs**,
   adicione a URL do app (ex.: `http://localhost:5173` e depois `https://<seu>.vercel.app`).
2. Crie a conta do titular: **Authentication → Users → Add user** (email + senha)
   — ou desligue “Confirm email” em **Providers → Email** e use “Criar conta” no app.

### 7. Segredos do Vault (cron) — SQL Editor
```sql
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
select vault.create_secret('https://<PROJECT_REF>.functions.supabase.co', 'functions_base_url');
```

### 8. Segredos das Edge Functions (UI)
**Project Settings → Edge Functions → Secrets** (ou Functions → Secrets) → adicione:
- `ANTHROPIC_API_KEY` (geração por IA)
- `IG_USER_ID`, `META_APP_ID`, `META_APP_SECRET`, `META_LONG_LIVED_TOKEN` (publicação — ver `docs/meta-setup.md`)

### ✅ O que já funciona depois da Parte 1
Rodando o app (local com `.env` ou no Vercel) com a **URL** e a **anon key**:
login, criar exemplo, **editar no canvas**, biblioteca e navegação. Ainda **não**:
gerar por IA, renderizar PNG, rodar conformidade e publicar — isso é a Parte 2.

---

## Parte 2 — Edge Functions (precisa de um passo de deploy)

O dashboard tem editor de funções, mas **`generate-carousel` e `render-slides`
importam código compartilhado de `src/`** (templates, medição, schema) via import
map — isso é empacotado por um bundler, não dá para colar arquivo único na UI.
Então o deploy das funções sai por **um** destes caminhos:

**Opção 1 — um comando (Node já basta, sem instalar CLI global):**
```bash
export SUPABASE_ACCESS_TOKEN=<seu-token>
npx --yes supabase@latest link --project-ref <PROJECT_REF>
npx --yes supabase@latest functions deploy \
  generate-carousel render-slides compliance-review publish-due-posts mixpost-schedule \
  --project-ref <PROJECT_REF>
```

**Opção 2 — GitHub Action (sem rodar nada localmente):**
Configure os secrets do repositório (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`,
`SUPABASE_DB_PASSWORD`) e dê merge na `main` — o workflow `.github/workflows/deploy.yml`
aplica migrações e faz o deploy das funções automaticamente.

> As três funções sem dependência de `src/` (`compliance-review`,
> `publish-due-posts`, `mixpost-schedule`) até dá para colar no editor web, mas
> como duas exigem o bundler, o mais simples é deployar todas de uma vez por aqui.

---

## Depois: Vercel
**Project Settings → Environment Variables** (Production + Preview):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLISH_PROVIDER=meta`. Deploy.
Adicione o domínio `*.vercel.app` no passo 6 (Auth → URL Configuration).
