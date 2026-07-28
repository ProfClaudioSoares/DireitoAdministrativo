#!/usr/bin/env node
// Cria os segredos do Vault usados pelo cron (§2/§10) — service_role_key e
// functions_base_url — via a API de gerenciamento do Supabase (POST
// /v1/projects/{ref}/database/query). Usa APENAS o token pessoal
// (SUPABASE_ACCESS_TOKEN); não precisa da senha do banco.
//
// Idempotente: só cria o segredo que ainda não existe.
//
// Env obrigatórias:
//   SUPABASE_ACCESS_TOKEN  token pessoal do Supabase
//   SUPABASE_PROJECT_REF   ref do projeto (ex.: abcxyz...)
//   SERVICE_ROLE_KEY       a chave service_role do projeto
//
// Uso: node scripts/set-vault-secrets.mjs

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = process.env.SUPABASE_PROJECT_REF
const srk = process.env.SERVICE_ROLE_KEY

if (!token || !ref || !srk) {
  console.error('✗ Faltam env vars: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF e SERVICE_ROLE_KEY.')
  process.exit(1)
}

const base = `https://${ref}.functions.supabase.co`
const api = `https://api.supabase.com/v1/projects/${ref}/database/query`

// Escapa uma string para literal SQL (aspas simples duplicadas).
function lit(s) {
  return "'" + String(s).replaceAll("'", "''") + "'"
}

async function runSql(query) {
  const res = await fetch(api, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) {
    console.error(`✗ Consulta falhou (HTTP ${res.status}): ${text}`)
    process.exit(1)
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const before = await runSql('select name from vault.secrets')
const names = new Set((Array.isArray(before) ? before : []).map((r) => r.name))

if (!names.has('service_role_key')) {
  await runSql(`select vault.create_secret(${lit(srk)}, 'service_role_key')`)
  console.log('✔ criado: service_role_key')
} else {
  console.log('• já existia: service_role_key')
}

if (!names.has('functions_base_url')) {
  await runSql(`select vault.create_secret(${lit(base)}, 'functions_base_url')`)
  console.log(`✔ criado: functions_base_url = ${base}`)
} else {
  console.log('• já existia: functions_base_url')
}

const after = await runSql('select name from vault.secrets order by name')
console.log('Vault agora contém:', (Array.isArray(after) ? after : []).map((r) => r.name).join(', ') || '(vazio)')
