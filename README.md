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

## Setup

1. **Instalar:** `npm install`
2. **Fontes/assets da marca:** baixe os quatro `.ttf` (ver `src/brand/fonts/README.md`)
   para `public/fonts/` e suba-os + os três PNGs (ver `src/brand/assets/README.md`)
   para o bucket `brand` do Supabase.
3. **Env:** copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` (somente valores públicos).
4. **Banco:** aplique as migrações de `supabase/migrations/` (`supabase db push`).
5. **Segredos das functions:** `supabase secrets set ANTHROPIC_API_KEY=… IG_USER_ID=… META_LONG_LIVED_TOKEN=…`
6. **Vault (cron):** crie os segredos `service_role_key` e `functions_base_url`
   (ver cabeçalho de `0004_cron.sql`).
7. **Deploy functions:** `supabase functions deploy generate-carousel render-slides compliance-review publish-due-posts`
8. **Dev:** `npm run dev`

### Scripts

- `npm run dev` · `npm run build` · `npm run typecheck` · `npm test`

## Pré-requisitos externos (o app não resolve sozinho — §10)

Conta Instagram profissional ligada a uma Página, app no Meta for Developers,
permissão `instagram_business_content_publish` aprovada em App Review (2–4 semanas)
e, se exigida, a **Page Publishing Authorization (PPA)** concluída antes de
qualquer publicação por API.

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
7. Publicação automática sem duplicar em falha → `publish-due-posts` (idempotência).
8. Nenhum token no bundle; chave do cron no Vault → `.env.example`, `_shared/client.ts`, `0004_cron.sql`.
