# Fontes da marca — instâncias estáticas `.ttf`

⚠ **Baixe instâncias estáticas** (não a versão variável) e coloque aqui, com estes
nomes exatos (referenciados em `src/brand/tokens.ts` → `FONT.files`):

| Arquivo | Fonte | Peso | Estilo |
|---|---|---|---|
| `PlayfairDisplay-Medium.ttf` | Playfair Display | 500 | normal |
| `PlayfairDisplay-MediumItalic.ttf` | Playfair Display | 500 | itálico (texto legal do T3) |
| `Jost-Light.ttf` | Jost | 300 | normal |
| `Jost-Medium.ttf` | Jost | 500 | normal |

São os **quatro cortes** exigidos (§4). O satori não sintetiza itálico — o corte
itálico do Playfair é obrigatório para o T3 (dispositivo).

## Por que estáticas, e nunca CDN

O `satori` tem suporte **pobre** a fonte variável — a versão variável do Google
Fonts renderiza no peso errado. E nada de CDN em runtime: a Edge Function carrega
os `.ttf` como `ArrayBuffer`. Ver §4 e §9 do prompt de construção.

## Onde estes arquivos são consumidos

1. **`src/lib/measure.ts`** (cliente e Edge Function) — mede texto com `opentype.js`
   a partir das métricas reais do `.ttf`. É a MESMA função que trava os 53 px.
2. **`supabase/functions/render-slides`** — passa os buffers ao `satori`.

Suba os mesmos arquivos para o bucket `brand` do Supabase Storage; a Edge Function
os lê de lá com cache em memória entre invocações (§9).

Os `.ttf` são ignorados pelo git (ver `.gitignore`) — são binários da marca.
