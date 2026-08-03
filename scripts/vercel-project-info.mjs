#!/usr/bin/env node
// Imprime dados do projeto no Vercel (id, accountId/orgId, e o vínculo com o
// repositório Git) para configurar o auto-deploy. Env: VERCEL_TOKEN, (opcional) REPO_MATCH.

const token = process.env.VERCEL_TOKEN
const repoMatch = process.env.REPO_MATCH || 'DireitoAdministrativo'
if (!token) {
  console.error('✗ Falta VERCEL_TOKEN.')
  process.exit(1)
}
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

async function api(url) {
  const r = await fetch(url, { headers: H })
  const t = await r.text()
  try {
    return { ok: r.ok, data: JSON.parse(t) }
  } catch {
    return { ok: r.ok, data: t }
  }
}

async function listProjects() {
  const scopes = [{ teamId: null }]
  const teams = await api('https://api.vercel.com/v2/teams')
  if (teams.ok && Array.isArray(teams.data.teams)) for (const t of teams.data.teams) scopes.push({ teamId: t.id })
  const all = []
  for (const s of scopes) {
    const q = s.teamId ? `&teamId=${s.teamId}` : ''
    const r = await api(`https://api.vercel.com/v9/projects?limit=100${q}`)
    if (r.ok && Array.isArray(r.data.projects)) for (const p of r.data.projects) all.push({ ...p, teamId: s.teamId })
  }
  return all
}

function score(p) {
  const link = p.link || {}
  const repo = `${link.repo || ''} ${link.repoId || ''}`.toLowerCase()
  const name = (p.name || '').toLowerCase()
  let s = 0
  if (repo.includes(repoMatch.toLowerCase())) s += 100
  if (['direito', 'administrativo'].some((k) => name.includes(k))) s += 10
  return s
}

const projects = await listProjects()
projects.sort((a, b) => score(b) - score(a))
const t = projects[0]
if (!t) {
  console.error('✗ Nenhum projeto acessível.')
  process.exit(1)
}
console.log(
  JSON.stringify(
    {
      name: t.name,
      PROJECT_ID: t.id,
      ORG_ID: t.accountId,
      teamId: t.teamId,
      gitLink: t.link ? { type: t.link.type, org: t.link.org, repo: t.link.repo, productionBranch: t.link.productionBranch, deployHooks: (t.link.deployHooks || []).length } : null,
    },
    null,
    2,
  ),
)
