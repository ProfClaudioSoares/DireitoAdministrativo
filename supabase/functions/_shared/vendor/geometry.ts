// ⚠ ARQUIVO GERADO por scripts/sync-functions-shared.mjs — NÃO EDITE À MÃO.
// Fonte única: src/templates/geometry.ts. Rode o script após editar o original.

// Geometria derivada dos tokens (§4). Uma vez, compartilhada por todos os templates.
import { FORMAT } from './tokens.ts'

export const SLIDE_W = FORMAT.width // 1080
export const SLIDE_H = FORMAT.height // 1350

export const MARGIN = {
  top: Math.round(SLIDE_H * FORMAT.margin.top), // 108
  right: Math.round(SLIDE_W * FORMAT.margin.right), // 81
  bottom: Math.round(SLIDE_H * FORMAT.margin.bottom), // ~88
  left: Math.round(SLIDE_W * FORMAT.margin.left), // ~184
}

// Caixa de conteúdo — à direita da coluna dórica.
export const CONTENT = {
  left: MARGIN.left,
  top: MARGIN.top,
  width: SLIDE_W - MARGIN.left - MARGIN.right, // ~815
  height: SLIDE_H - MARGIN.top - MARGIN.bottom, // ~1154
}

// Coluna dórica (§4). Vive na margem esquerda larga.
export const COLUMN = {
  width: 46, // W
  left: 70, // afastamento da borda esquerda
  top: MARGIN.top,
  height: SLIDE_H - MARGIN.top - MARGIN.bottom,
}
