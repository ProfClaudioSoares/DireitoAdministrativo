# public/fonts

Coloque aqui as MESMAS instâncias estáticas `.ttf` de `src/brand/fonts/` — o
preview do navegador (`@font-face` em `src/index.css`) e a medição (`lib/measure`)
as consomem por estes caminhos:

- `PlayfairDisplay-Medium.ttf`
- `PlayfairDisplay-MediumItalic.ttf`
- `Jost-Light.ttf`
- `Jost-Medium.ttf`

São as mesmas fontes que a Edge Function `render-slides` passa ao satori (lá,
lidas do bucket `brand`). Manter a mesma instância nos dois lados é o que garante
que o preview case com o PNG (§4, §9, §12 critério 5).
