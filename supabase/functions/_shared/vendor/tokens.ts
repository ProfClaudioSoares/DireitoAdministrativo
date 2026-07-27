// ⚠ ARQUIVO GERADO por scripts/sync-functions-shared.mjs — NÃO EDITE À MÃO.
// Fonte única: src/brand/tokens.ts. Rode o script após editar o original.

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM — TOKENS EXATOS (§4)
// Amostrados do arquivo original da marca Claudio Soares · Boutique Jurídica.
// NÃO altere, NÃO "melhore", NÃO gere variações.
//
// ⚠ Este NÃO é o design system Édition Lumière do DELIC PRO (§0-B). Herde apenas
//   a ARQUITETURA daquele ecossistema; nenhum token visual.
// ─────────────────────────────────────────────────────────────────────────────

export const color = {
  ink: '#050505', // fundo dos slides escuros e da UI
  paper: '#F0EDE6', // fundo dos slides claros
  amber: '#FD8902', // cor da marca — tom dominante (SÓ sobre preto)
  amberHi: '#FEB90E', // topo do gradiente do monograma
  amberDeep: '#F67104', // base do gradiente
  amberBurnt: '#A85000', // ÚNICA variante de âmbar sobre papel
  grey: '#8C877E',
  greyDark: '#4E4941',
} as const

export type Background = typeof color.ink | typeof color.paper

// Regra rígida (§4): âmbar puro (#FD8902) SÓ sobre preto. Sobre papel, SEMPRE
// amber-burnt. Os templates são OBRIGADOS a usar este helper; a cor de âmbar
// nunca é escrita literalmente dentro de um template. Um teste unitário percorre
// os cinco templates em ambos os fundos e falha se achar #FD8902 sobre papel.
export function amberFor(background: Background): string {
  return background === color.paper ? color.amberBurnt : color.amber
}

// Formato final (§4)
export const FORMAT = {
  width: 1080,
  height: 1350, // 4:5
  // Margens em fração do lado correspondente
  margin: {
    top: 0.08,
    right: 0.075,
    bottom: 0.065,
    left: 0.17, // larga: abriga a coluna dórica
  },
} as const

// Tamanhos mínimos no formato 1080×1350 (§4)
export const TYPE = {
  title: 106,
  subtitle: 90,
  body: 53, // MÍNIMO ABSOLUTO — travado por lib/measure, não pelo DOM
  bodyMin: 53,
  label: 33,
  lineHeight: 1.28, // sempre numérico (§4-A regra 2)
} as const

// Fontes estáticas (§4 / §9). Instâncias estáticas, nunca fonte variável, nunca CDN.
// São os QUATRO cortes: Playfair 500 (normal e itálico — o itálico serve ao texto
// legal do T3) e Jost 300/500.
export const FONT = {
  displayFamily: 'Playfair Display',
  utilFamily: 'Jost',
  files: {
    playfair500: 'PlayfairDisplay-Medium.ttf',
    playfairItalic500: 'PlayfairDisplay-MediumItalic.ttf',
    jost300: 'Jost-Light.ttf',
    jost500: 'Jost-Medium.ttf',
  },
} as const
