#!/usr/bin/env node
// Vendoriza os módulos compartilhados de src/ para dentro de supabase/functions/,
// porque o bundler do Supabase só enxerga arquivos sob supabase/functions/ (ele
// empacota num contêiner que monta apenas essa pasta). Mantém a fonte única em
// src/ e ESTES arquivos derivados; rode este script após editar os templates.
//
// Uso: node scripts/sync-functions-shared.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'supabase/functions/_shared/vendor')
mkdirSync(OUT, { recursive: true })

const HEADER =
  '// ⚠ ARQUIVO GERADO por scripts/sync-functions-shared.mjs — NÃO EDITE À MÃO.\n' +
  '// Fonte única: {src}. Rode o script após editar o original.\n'

// Reescreve imports @/ para os vizinhos vendorizados (pasta plana).
function rewrite(code) {
  return code
    .replaceAll("@/brand/tokens.ts", "./tokens.ts")
    .replaceAll("@/brand/tokens", "./tokens.ts")
    .replaceAll("@/lib/types.ts", "./app-types.ts")
    .replaceAll("@/lib/types", "./app-types.ts")
}

function vendor(srcRel, outName) {
  const src = join(ROOT, srcRel)
  const code = readFileSync(src, 'utf8')
  const out = join(OUT, outName)
  writeFileSync(out, HEADER.replace('{src}', srcRel) + '\n' + rewrite(code))
  console.log('vendored', srcRel, '→', out.replace(ROOT + '/', ''))
}

// Tipos mínimos que os templates consomem de lib/types (evita vendorizar tudo).
writeFileSync(
  join(OUT, 'app-types.ts'),
  HEADER.replace('{src}', 'src/lib/types.ts (subset)') +
    "\nexport type TemplateId = 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'T9'\n",
)
console.log('wrote app-types.ts (TemplateId)')

vendor('src/brand/tokens.ts', 'tokens.ts')
vendor('src/templates/geometry.ts', 'geometry.ts')
vendor('src/templates/types.ts', 'types.ts')
vendor('src/templates/Column.tsx', 'Column.tsx')
vendor('src/templates/index.tsx', 'templates.tsx')
vendor('src/lib/schema.ts', 'schema.ts')

console.log('\nOK. As Edge Functions importam de _shared/vendor/*.')
void dirname // (mantém import previsível)
