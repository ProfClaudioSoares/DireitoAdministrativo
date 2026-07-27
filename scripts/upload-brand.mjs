#!/usr/bin/env node
// Sobe os binários da marca (4 .ttf + 3 PNGs) para o bucket `brand` do Supabase.
// Usa a service_role key (nunca vai ao cliente). Idempotente (upsert).
//
// Uso:
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/upload-brand.mjs [dir]
// `dir` padrão: ./brand-assets  (coloque lá os arquivos com os nomes esperados)
import { readdir, readFile } from 'node:fs/promises'
import { join, extname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dir = resolve(process.argv[2] || 'brand-assets')

if (!url || !key) {
  console.error('Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

// Arquivos esperados no bucket (§4). O script sobe o que encontrar destes.
const EXPECTED = [
  'PlayfairDisplay-Medium.ttf',
  'PlayfairDisplay-MediumItalic.ttf',
  'Jost-Light.ttf',
  'Jost-Medium.ttf',
  'monogram-amber.png',
  'monogram-dark.png',
  'wordmark.png',
]

const CONTENT_TYPE = { '.ttf': 'font/ttf', '.png': 'image/png' }

const supabase = createClient(url, key, { auth: { persistSession: false } })

let present
try {
  present = new Set(await readdir(dir))
} catch {
  console.error(`Diretório não encontrado: ${dir}`)
  process.exit(1)
}

let ok = 0
let missing = 0
for (const name of EXPECTED) {
  if (!present.has(name)) {
    console.warn(`· ausente (pulado): ${name}`)
    missing++
    continue
  }
  const bytes = await readFile(join(dir, name))
  const { error } = await supabase.storage
    .from('brand')
    .upload(name, bytes, { contentType: CONTENT_TYPE[extname(name)] || 'application/octet-stream', upsert: true })
  if (error) {
    console.error(`✗ falha ao subir ${name}: ${error.message}`)
    process.exit(1)
  }
  console.log(`✓ ${name}`)
  ok++
}

console.log(`\nConcluído: ${ok} enviado(s), ${missing} ausente(s).`)
if (missing > 0) console.log('Suba os ausentes para um render/preview fiel (§4/§9).')
