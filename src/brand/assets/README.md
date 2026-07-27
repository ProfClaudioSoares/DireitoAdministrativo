# Assets de marca — PNGs

Três PNGs de marca, fundo transparente, já recortados (§4):

| Arquivo | Uso |
|---|---|
| `monogram-amber.png` | monograma âmbar — sobre fundo `ink` |
| `monogram-dark.png` | monograma escuro — sobre fundo `paper` |
| `wordmark.png` | wordmark — usado no T5 (fecho) |

Servidos do Supabase Storage no bucket `brand`.

⚠ O `satori` precisa deles como **data URI base64 embutido** no momento do render —
a Edge Function `render-slides` resolve as imagens ANTES de montar o SVG. Nunca se
passa URL remota ao `satori`. Ver §4 e §9.
