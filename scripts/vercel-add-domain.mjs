#!/usr/bin/env node
// Adiciona um domínio a um projeto do Vercel via API. Descobre o projeto pelo
// repositório vinculado (ou pelo nome) e imprime as instruções de DNS.
// Env: VERCEL_TOKEN, DOMAIN, (opcional) REPO_MATCH.
// Uso: node scripts/vercel-add-domain.mjs

const token = process.env.VERCEL_TOKEN
const domain = process.env.DOMAIN
const repoMatch = process.env.REPO_MATCH || 'DireitoAdministrativo'

if (!token || !domain) {
  console.error('✗ Faltam env vars VERCEL_TOKEN e DOMAIN.')
  process.exit(1)
}

const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...H, ...(opts.headers || {}) } })
  const text = await r.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { ok: r.ok, status: r.status, data }
}

// Coleta projetos do escopo pessoal e de todos os times acessíveis.
async function listProjects() {
  const scopes = [{ teamId: null }]
  const teams = await api('https://api.vercel.com/v2/teams')
  if (teams.ok && Array.isArray(teams.data.teams)) {
    for (const t of teams.data.teams) scopes.push({ teamId: t.id })
  }
  const all = []
  for (const s of scopes) {
    const q = s.teamId ? `&teamId=${s.teamId}` : ''
    const r = await api(`https://api.vercel.com/v9/projects?limit=100${q}`)
    if (r.ok && Array.isArray(r.data.projects)) {
      for (const p of r.data.projects) all.push({ ...p, teamId: s.teamId })
    }
  }
  return all
}

function score(p) {
  const link = p.link || {}
  const repo = `${link.repo || ''} ${link.repoId || ''}`.toLowerCase()
  const name = (p.name || '').toLowerCase()
  let s = 0
  if (repo.includes(repoMatch.toLowerCase())) s += 100
  if ((link.org || '').toLowerCase().includes('profclaudiosoares')) s += 50
  if (['direito', 'estudio', 'conteudo', 'administrativo', 'cs'].some((k) => name.includes(k))) s += 10
  return s
}

const projects = await listProjects()
console.log('Projetos visíveis:', projects.map((p) => p.name).join(', ') || '(nenhum)')
if (projects.length === 0) {
  console.error('✗ Nenhum projeto acessível com este token.')
  process.exit(1)
}

projects.sort((a, b) => score(b) - score(a))
const target = projects[0]
console.log(`→ Projeto escolhido: ${target.name} (${target.id}) ${target.teamId ? `[team ${target.teamId}]` : '[pessoal]'}`)

const tq = target.teamId ? `?teamId=${target.teamId}` : ''

// Adiciona o domínio (409 = já existe, tudo bem).
const add = await api(`https://api.vercel.com/v10/projects/${target.id}/domains${tq}`, {
  method: 'POST',
  body: JSON.stringify({ name: domain }),
})
if (!add.ok && add.status !== 409) {
  console.error(`✗ Falha ao adicionar domínio (HTTP ${add.status}):`, JSON.stringify(add.data))
  process.exit(1)
}
console.log(add.status === 409 ? `• Domínio "${domain}" já estava no projeto.` : `✔ Domínio "${domain}" adicionado ao projeto.`)

// Estado/verificação do domínio.
const info = await api(`https://api.vercel.com/v9/projects/${target.id}/domains/${domain}${tq}`)
const cfg = await api(`https://api.vercel.com/v9/projects/${target.id}/domains/${domain}/config${tq}`)

console.log('--- DOMAIN INFO ---')
console.log(JSON.stringify({ verified: info.data?.verified, verification: info.data?.verification }, null, 2))
console.log('--- DNS CONFIG ---')
console.log(JSON.stringify({ misconfigured: cfg.data?.misconfigured, recommendedCNAME: cfg.data?.recommendedCNAME, recommendedIPv4: cfg.data?.recommendedIPv4 }, null, 2))

console.log('\n=== RESUMO PARA O DNS (Hostinger) ===')
console.log(`Crie um registro CNAME:  ${domain.split('.')[0]}  ->  cname.vercel-dns.com`)
if (info.data?.verification?.length) {
  console.log('Verificação extra exigida (adicione também no DNS):')
  for (const v of info.data.verification) console.log(`  ${v.type}  ${v.domain}  =  ${v.value}`)
}
console.log(`Status atual: ${info.data?.verified ? 'verificado' : 'aguardando DNS'} | misconfigured=${cfg.data?.misconfigured}`)
