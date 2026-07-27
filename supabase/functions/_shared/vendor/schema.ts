// ⚠ ARQUIVO GERADO por scripts/sync-functions-shared.mjs — NÃO EDITE À MÃO.
// Fonte única: src/lib/schema.ts. Rode o script após editar o original.

// Validação zod da resposta da IA (§7). NÃO confie na forma — valide.
// Este schema é compartilhado: o cliente conhece a forma e a Edge Function
// `generate-carousel` valida antes de devolver (parse defensivo).

import { z } from 'zod'

export const templateIdSchema = z.enum(['T1', 'T2', 'T3', 'T4', 'T5'])

export const generatedSlideSchema = z.object({
  template: templateIdSchema,
  eyebrow: z.string().nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  citation: z.string().nullable(),
  alt_text: z.string().min(1).max(200),
})

export const generatedCarouselSchema = z.object({
  title: z.string().min(1),
  slides: z
    .array(generatedSlideSchema)
    .min(5)
    .max(7)
    // ESTRUTURA (§7): começa sempre em T1, termina sempre em T5.
    .refine((s) => s[0]?.template === 'T1', { message: 'O primeiro slide deve ser T1 (capa-tese).' })
    .refine((s) => s[s.length - 1]?.template === 'T5', { message: 'O último slide deve ser T5 (fecho).' }),
  caption: z.string().min(1),
  hashtags: z.array(z.string()),
})

export type GeneratedCarouselParsed = z.infer<typeof generatedCarouselSchema>

/** Remove cercas de markdown antes do JSON.parse (parse defensivo, §7). */
export function stripCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}
