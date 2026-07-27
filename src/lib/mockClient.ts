// ─────────────────────────────────────────────────────────────────────────────
// MODO DEMO — cliente Supabase falso, em memória (sem backend).
//
// Ativado automaticamente quando VITE_SUPABASE_URL/ANON_KEY não estão definidos
// (ver supabase.ts). Deixa o app NAVEGÁVEL sem Supabase: sem login, com um
// carrossel de exemplo já semeado, e todo o fluxo (editar → conformidade →
// aprovar → agendar) rodando com estado em memória.
//
// NÃO substitui o backend real: não há RLS, triggers nem persistência entre
// recarregamentos. Serve para preview/demo (Vercel sem env, ou local sem .env).
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>
type Store = Record<string, Row[]>

const store: Store = { posts: [], slides: [], citations: [], compliance_flags: [], pauta: [] }

function uuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })
}

function nowIso(): string {
  return new Date().toISOString()
}

function withDefaults(table: string, v: Row): Row {
  const base: Row = { id: uuid(), ...v }
  if (table === 'posts') {
    base.created_at ??= nowIso()
    base.updated_at ??= nowIso()
    base.status ??= 'draft'
    base.owner_id ??= 'demo-user'
  }
  if (table === 'slides' || table === 'citations' || table === 'compliance_flags') {
    base.owner_id ??= 'demo-user'
  }
  if (table === 'citations') base.verified ??= false
  if (table === 'compliance_flags') base.resolved ??= false
  return base
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private mode: 'select' | 'insert' | 'update' | 'delete' = 'select'
  private values: Row | Row[] = {}
  private filters: ((r: Row) => boolean)[] = []
  private orderBy: { col: string; asc: boolean } | null = null
  private singleRow = false
  private selected = false
  private head = false
  private wantCount = false

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.mode === 'select') this.mode = 'select'
    this.selected = true
    if (opts?.count) this.wantCount = true
    if (opts?.head) this.head = true
    return this
  }
  insert(v: Row | Row[]) {
    this.mode = 'insert'
    this.values = v
    return this
  }
  update(v: Row) {
    this.mode = 'update'
    this.values = v
    return this
  }
  delete() {
    this.mode = 'delete'
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val)
    return this
  }
  neq(col: string, val: unknown) {
    this.filters.push((r) => r[col] !== val)
    return this
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]))
    return this
  }
  gte(col: string, val: unknown) {
    this.filters.push((r) => String(r[col]) >= String(val))
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending !== false }
    return this
  }
  single() {
    this.singleRow = true
    return this
  }

  then<TResult1 = { data: unknown; error: unknown; count?: number }>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
  ): PromiseLike<TResult1> {
    return Promise.resolve(this.run()).then(onfulfilled ?? undefined) as PromiseLike<TResult1>
  }

  private run(): { data: unknown; error: unknown; count?: number } {
    const t = (store[this.table] ??= [])

    if (this.mode === 'insert') {
      const arr = Array.isArray(this.values) ? this.values : [this.values]
      const inserted = arr.map((v) => withDefaults(this.table, v))
      t.push(...inserted)
      if (this.singleRow) return { data: inserted[0] ?? null, error: null }
      return { data: this.selected ? inserted : null, error: null }
    }

    let rows = t.filter((r) => this.filters.every((f) => f(r)))

    if (this.mode === 'update') {
      rows.forEach((r) => Object.assign(r, this.values, this.table === 'posts' ? { updated_at: nowIso() } : {}))
      if (this.singleRow) return { data: rows[0] ?? null, error: rows[0] ? null : notFound() }
      return { data: this.selected ? rows : null, error: null }
    }

    if (this.mode === 'delete') {
      store[this.table] = t.filter((r) => !this.filters.every((f) => f(r)))
      return { data: null, error: null }
    }

    // select
    if (this.orderBy) {
      const { col, asc } = this.orderBy
      rows = [...rows].sort((a, b) => {
        const av = a[col] as never
        const bv = b[col] as never
        return (av > bv ? 1 : av < bv ? -1 : 0) * (asc ? 1 : -1)
      })
    }
    if (this.head && this.wantCount) return { data: null, count: rows.length, error: null }
    if (this.singleRow) return { data: rows[0] ?? null, error: rows[0] ? null : notFound() }
    return { data: rows, error: null, count: this.wantCount ? rows.length : undefined }
  }
}

function notFound() {
  return { message: 'Nenhum registro encontrado (modo demo).', code: 'PGRST116' }
}

const fakeSession = { user: { id: 'demo-user', email: 'demo@local' }, access_token: 'demo' }

export function createMockClient(): unknown {
  return {
    from: (table: string) => new QueryBuilder(table),
    storage: {
      from: () => ({
        // Sem bucket no modo demo: assets/fontes caem em fallback/placeholder.
        download: async () => ({ data: null, error: { message: 'offline' } }),
        createSignedUrl: async () => ({ data: null, error: { message: 'offline' } }),
        upload: async () => ({ data: { path: 'demo' }, error: null }),
      }),
    },
    auth: {
      getSession: async () => ({ data: { session: fakeSession }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: { session: fakeSession }, error: null }),
      signUp: async () => ({ data: { session: fakeSession }, error: null }),
      signOut: async () => ({ error: null }),
    },
    functions: { invoke: async () => ({ data: null, error: { message: 'offline' } }) },
  }
}

// ── Semente do exemplo (mesma do lib/demo, para o modo demo ter conteúdo) ──────
function seedDemoPost(): string {
  const id = uuid()
  store.posts.push(
    withDefaults('posts', {
      id,
      title: 'Impugnação de edital: o que muda o jogo',
      pillar: 'artigo_semana',
      status: 'draft',
      caption:
        'O edital saiu com um erro que elimina você antes de começar.\n\n' +
        'A maioria vê o problema, reclama nos bastidores e mesmo assim entrega a proposta.\n\n' +
        'A impugnação existe para apontar o defeito enquanto ainda dá tempo. O critério de julgamento menor preço não muda esse direito.\n\n' +
        'Impugnar não é atrasar. É garantir que a regra valha para todos.\n\n' +
        'Você já deixou de impugnar um edital por achar que "não valia a pena"?\n\n' +
        'Claudio Soares · OAB/RS 49.924\nConteúdo informativo. Não constitui consulta nem oferta de serviço.',
      hashtags: ['#licitacoes', '#lei14133', '#direitoadministrativo'],
    }),
  )
  const slides = [
    { template: 'T1', eyebrow: 'LICITAÇÕES', title: 'Impugnação de edital: o que muda o jogo', body: null, citation: null },
    { template: 'T2', eyebrow: null, title: 'O prazo que decide', body: 'Até 3 dias úteis\nantes da abertura.', citation: null },
    { template: 'T3', eyebrow: 'DISPOSITIVO', title: null, body: 'A Administração deve\nresponder em até\ntrês dias úteis.', citation: 'art. 164 da Lei 14.133/2021' },
    { template: 'T4', eyebrow: 'TESE', title: 'Impugnar não atrasa. Organiza.', body: 'O vício some antes\nda proposta.', citation: null },
    { template: 'T5', eyebrow: null, title: 'Siga para mais análises de licitações.', body: 'Conteúdo informativo. Não constitui consulta nem oferta de serviço.', citation: null },
  ]
  slides.forEach((s, i) =>
    store.slides.push(withDefaults('slides', { ...s, post_id: id, position: i, rendered_url: 'demo/placeholder.png', alt_text: 'Slide de exemplo.' })),
  )
  store.citations.push(withDefaults('citations', { post_id: id, raw_text: 'art. 164 da Lei 14.133/2021', kind: 'dispositivo', text_hash: 'demo', verified: false }))
  store.compliance_flags.push(
    withDefaults('compliance_flags', {
      post_id: id,
      rule: 'termo_ambiguo',
      layer: 'regex',
      severity: 'warn',
      excerpt: '…critério de julgamento menor preço não muda…',
      rationale: 'Termo nativo de licitações ("menor preço"). Só alerta — o titular decide.',
      resolved: false,
    }),
  )
  return id
}

let seeded = false
function ensureSeed() {
  if (!seeded) {
    seedDemoPost()
    seeded = true
  }
}
ensureSeed()

// Mock das Edge Functions no modo demo.
export async function mockInvoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const postId = String(body?.post_id ?? '')
  if (name === 'generate-carousel') {
    const id = seedDemoPost()
    return { post_id: id } as unknown as T
  }
  if (name === 'compliance-review') {
    const post = store.posts.find((p) => p.id === postId)
    if (post) post.status = 'review'
    return { status: 'review' } as unknown as T
  }
  if (name === 'render-slides') {
    store.slides.filter((s) => s.post_id === postId).forEach((s) => (s.rendered_url ??= 'demo/placeholder.png'))
    return { next: null } as unknown as T
  }
  return { } as T
}
