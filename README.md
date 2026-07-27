# Estúdio de Conteúdo CS · v1.1

Aplicativo web de dono único para o titular da **Claudio Soares · Boutique
Jurídica**: gera carrosséis de Instagram com IA a partir de pautas jurídicas,
edita cada slide num canvas fiel à marca, passa o conteúdo por um portão de
conformidade da OAB, exporta em 1080 × 1350 e agenda a publicação.

> Scaffold construído a partir da especificação v1.1. Este NÃO é o design system
> Édition Lumière do DELIC PRO — é o sistema preto/âmbar/Playfair da boutique
> (§0-B). Herda daquele apenas a arquitetura: geração → portão de risco → edição
> → fila de publicação.

## Stack

React 18 + Vite + TS + Tailwind · Zustand · Supabase (Postgres/Auth/Storage/Edge
Functions Deno) · Anthropic Messages API (só na Edge Function) · `satori` +
`@resvg/resvg-wasm` para SVG→PNG determinístico · `pg_cron`/`pg_net` para o worker.

## Invariantes que este scaffold trava

| Onde | Invariante |
|---|---|
| `src/brand/tokens.ts` | `amberFor(bg)` — âmbar puro só sobre preto; sobre papel, `amber-burnt`. A cor nunca é escrita literal num template. |
| `src/templates/` | Os **cinco** templates existem UMA vez; o mesmo código alimenta o preview (React DOM) e o PNG (satori). Escritos dentro do subconjunto CSS do satori (§4-A). |
| `src/templates/Column.tsx` | Coluna dórica por elementos explícitos + progresso via `overflow:hidden` (sem `repeating-linear-gradient`, `clip-path` ou `mask`). |
| `src/lib/measure.ts` | Medição única via `opentype.js` (métricas reais do `.ttf`). A trava dos 53 px usa esta função, nunca o DOM. |
| `src/templates/__tests__` | Testes travam: (1) nenhum `#FD8902` sobre papel; (2) âmbar só em elemento fino — nunca preenche área grande (garantia dos 8%). |
| `supabase/migrations/0002_triggers.sql` | Editar post `approved`/`scheduled` → volta a `draft` e reabre flags. Citação verificada é fixada por hash; editou o texto, perde a verificação. Portão de trânsito recusa `scheduled` com pendência. |
| `supabase/functions/_shared/compliance.ts` | Regex recalibrada: `preço`, `garant`, `R$` são apenas WARN (vocabulário nativo de licitações), nunca block. |
| `supabase/functions/publish-due-posts` | Idempotência: container ids persistidos antes de cada avanço; retentativa retoma do mesmo pai, nunca duplica. Teto de 10 slides em código. |

## Estrutura

Ver `src/` (app, studio, templates, generator, compliance, calendar, library,
brand, lib) e `supabase/` (migrations + functions). O import map em
`supabase/functions/deno.json` aponta `@/` para `src/`, para que templates,
`measure` e `schema` sejam código ÚNICO compartilhado (§3), sem duplicação.

## Colocar no ar

Checklist único e ordenado (token → Supabase → Meta → Vercel → teste) em
[`docs/go-live.md`](docs/go-live.md). Guias detalhados: `docs/setup-web.md`,
`docs/meta-setup.md`, `docs/mixpost-setup.md`.

## Setup

> **Como criar o projeto Supabase:**
> - **Com token, sem CLI local:** Actions → **Bootstrap Supabase** (workflow
>   manual `.github/workflows/bootstrap-supabase.yml`). Adicione o secret do repo
>   `SUPABASE_ACCESS_TOKEN`, rode informando o `org_id`, e o GitHub cria o
>   projeto + migra + deploya as functions.
> - **Com token, localmente:** `scripts/bootstrap-supabase.sh` (um comando).
> - **Sem token, clicável:** guia pelo painel web em [`docs/setup-web.md`](docs/setup-web.md).

1. **Instalar:** `npm install`
2. **Fontes/assets da marca:** suba os quatro `.ttf` (ver `src/brand/fonts/README.md`)
   e os três PNGs (ver `src/brand/assets/README.md`) para o bucket `brand` do
   Supabase. As fontes são baixadas em runtime do bucket e injetadas via CSS Font
   Loading API (`src/lib/fonts.ts`) — nada de binário no repositório nem em `public/`.
3. **Env:** copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (somente valores públicos).
4. **Banco:** aplique as migrações de `supabase/migrations/` (`supabase db push`).
5. **Segredos das functions:**
   `supabase secrets set ANTHROPIC_API_KEY=… IG_USER_ID=… META_APP_ID=… META_APP_SECRET=… META_LONG_LIVED_TOKEN=…`
   (a chave da IA e os tokens vivem só aqui, nunca no cliente; ver `docs/meta-setup.md`).
6. **Vault (cron):** crie os segredos `service_role_key` e `functions_base_url`
   (ver cabeçalho de `0004_cron.sql`).
7. **Deploy functions:** `supabase functions deploy generate-carousel render-slides compliance-review publish-due-posts mixpost-schedule`
8. **Dev:** `npm run dev` (exige `.env` configurado — sem ele, o app mostra a tela “configure o Supabase”).

### Scripts

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm test`

## Deploy no Vercel (só o front-end)

O Vercel hospeda **apenas o SPA** (build do Vite). O backend — Edge Functions,
migrações e `pg_cron` — continua no **Supabase**; nada disso vai para o Vercel.

1. **Conecte o repositório** em [vercel.com/new](https://vercel.com/new) →
   importe `ProfClaudioSoares/DireitoAdministrativo`. O `vercel.json` já define
   framework `vite`, `outputDirectory: dist` e o rewrite de SPA (todas as rotas →
   `index.html`, para o React Router).
2. **Variáveis de ambiente** (Project → Settings → Environment Variables, para
   Production e Preview) — o Vite embute no build, então precisam existir *antes*
   do build:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   ⚠ Só valores públicos. Nenhuma chave de serviço/IA/Meta vai ao Vercel — elas
   vivem nos secrets do Supabase (§12 critério 8).
3. **Deploy.** Cada push na branch dispara um Preview; merge na `main` publica em
   produção.
4. **CORS/Auth do Supabase:** adicione o domínio do Vercel (ex.
   `https://<projeto>.vercel.app`) em Supabase → Authentication → URL
   Configuration (Site URL / Redirect URLs).

> **Fontes da marca:** vêm do bucket `brand` do Supabase em runtime (não do repo
> nem de `public/`). Para um deploy fiel, garanta que os quatro `.ttf` estão no
> bucket e que o usuário autenticado tem leitura nele (política em `0003_storage.sql`).

## Deploy automatizado

Duas formas, complementares:

### a) Script local — `scripts/deploy.sh`
Orquestra Supabase (link, migrações, secrets, upload de assets da marca, deploy
das functions) + Vercel (pull, build, deploy). Usa os CLIs via `npx`, não hardcoda
segredo — tudo vem do ambiente. Exemplo:

```bash
export SUPABASE_ACCESS_TOKEN=… SUPABASE_PROJECT_REF=… SUPABASE_DB_PASSWORD=…
export SUPABASE_SERVICE_ROLE_KEY=…            # p/ subir fontes/PNGs ao bucket
export VITE_SUPABASE_URL=…                     # url do projeto
export ANTHROPIC_API_KEY=… IG_USER_ID=… META_LONG_LIVED_TOKEN=…   # secrets das functions
export VERCEL_TOKEN=… VERCEL_ORG_ID=… VERCEL_PROJECT_ID=…
# coloque os .ttf/.png em ./brand-assets/ (nomes em src/brand/*/README.md)
./scripts/deploy.sh                 # produção;  ./scripts/deploy.sh preview  p/ preview
```

Só subir as fontes/assets ao bucket: `node scripts/upload-brand.mjs ./brand-assets`.

### b) GitHub Actions — `.github/workflows/deploy.yml`
- **PR:** `check` (typecheck + testes + build) e **preview** no Vercel.
- **push na `main`:** produção no Vercel + migrações e functions no Supabase.

Configure em **Settings → Secrets and variables → Actions**:

| Secret | Para quê |
|---|---|
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | deploy do front-end |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | migrações + functions |

As `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` do build vêm das **Environment
Variables do projeto no Vercel** (o `vercel pull` as busca) — não precisam ir ao
GitHub. Os secrets das Edge Functions e os segredos do Vault (cron) são definidos
uma vez, fora do CI (via `deploy.sh` ou manualmente).

## Publicação (padrão: Meta Graph API — grátis, um usuário)

Selecionada por `VITE_PUBLISH_PROVIDER` (`meta` padrão, ou `mixpost`).

### Meta Graph API (padrão) — `docs/meta-setup.md`
Gratuita e **sem App Review para a sua própria conta** (app em modo de
desenvolvimento + seu Instagram como admin/testador). Ao agendar, o post fica
`scheduled` e o worker **`publish-due-posts`** (pg_cron, a cada 5 min) publica o
carrossel no horário, de forma **idempotente** (ids de container gravados antes de
cada passo → retentativa não duplica). Secrets: `IG_USER_ID`, `META_APP_ID`,
`META_APP_SECRET`, `META_LONG_LIVED_TOKEN`. App Review só é preciso para publicar
em contas de terceiros.

### Mixpost (alternativa) — `docs/mixpost-setup.md`
Com `VITE_PUBLISH_PROVIDER=mixpost`, ao agendar, a Edge Function
`mixpost-schedule` sobe os PNGs e cria o post agendado no Mixpost, que publica no
horário. Idempotência por `mixpost_post_uuid` / `mixpost_media_ids` (migração
`0006`). ⚠ A API REST do Mixpost é recurso do **Pro** (o Lite não expõe `/api`).

## Fora de escopo na v1 (§11)

Reels/vídeo, Stories, multiusuário, analytics, geração de imagem por IA,
LinkedIn/Threads, aprovação por terceiros, biblioteca de mídia.

## Critérios de aceite (§12) — onde cada um vive

1. Geração na voz definida → `generate-carousel` + `_shared/prompt.ts`.
2. Preview em tempo real com o mesmo código do PNG → `studio/CanvasPreview.tsx` + `templates/`.
3. Citação bloqueia agendamento até verificação → trigger `trg_gate_schedule` + `compliance/`.
4. Bloqueio de oferta de honorários; "menor preço" passa → `_shared/compliance.ts`.
5. Fidelidade preview↔PNG (≤2 px) → fonte/medição únicas; teste de comparação SVG↔captura é o próximo passo automatizável.
6. Editar aprovado volta a rascunho → triggers de invalidação.
7. Publicação sem duplicar em falha → `mixpost-schedule` (idempotência por uuid/media ids); Meta em `publish-due-posts`.
8. Nenhum token no bundle; chaves de IA/Mixpost só no servidor; chave do cron no Vault → `.env.example`, `_shared/client.ts`, `0004_cron.sql`.
