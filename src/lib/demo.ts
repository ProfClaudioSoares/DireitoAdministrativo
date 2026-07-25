// Modo DEMO — semeia um carrossel de exemplo direto no banco (client-side),
// sem chamar a IA nem nenhuma Edge Function. Serve para percorrer o fluxo
// inteiro (editar → conformidade → aprovar → agendar) só com Supabase + login.
//
// Semeia também os artefatos de conformidade (uma citação por verificar e um
// aviso "menor preço" que PASSA) e um rendered_url placeholder em cada slide,
// para o portão de agendamento (trigger de banco) poder ser satisfeito.
import { supabase } from './supabase'
import type { GeneratedCarousel } from './types'

const DEMO: GeneratedCarousel & { slides: (GeneratedCarousel['slides'][number] & { alt_text: string })[] } = {
  title: 'Impugnação de edital: o que muda o jogo',
  slides: [
    {
      template: 'T1',
      eyebrow: 'LICITAÇÕES',
      title: 'Impugnação de edital: o que muda o jogo',
      body: null,
      citation: null,
      alt_text: 'Capa escura com título sobre impugnação de edital e o monograma da marca.',
    },
    {
      template: 'T2',
      eyebrow: null,
      title: 'O prazo que decide',
      body: 'Até 3 dias úteis\nantes da abertura.',
      citation: null,
      alt_text: 'Slide claro com numeral queimado e destaque para o prazo de impugnação.',
    },
    {
      template: 'T3',
      eyebrow: 'DISPOSITIVO',
      title: null,
      body: 'A Administração deve\nresponder em até\ntrês dias úteis.',
      citation: 'art. 164 da Lei 14.133/2021',
      alt_text: 'Slide escuro com texto legal em itálico e a citação do dispositivo em âmbar.',
    },
    {
      template: 'T4',
      eyebrow: 'TESE',
      title: 'Impugnar não atrasa. Organiza.',
      body: 'O vício some antes\nda proposta.',
      citation: null,
      alt_text: 'Slide escuro com a tese central sobre o efeito de impugnar o edital.',
    },
    {
      template: 'T5',
      eyebrow: null,
      title: 'Siga para mais análises de licitações.',
      body: 'Conteúdo informativo. Não constitui consulta nem oferta de serviço.',
      citation: null,
      alt_text: 'Fecho com monograma grande, wordmark e a inscrição OAB/RS 49.924.',
    },
  ],
  caption:
    'O edital saiu com um erro que elimina você antes de começar.\n\n' +
    'A maioria vê o problema, reclama nos bastidores e mesmo assim entrega a ' +
    'proposta. Depois perde na análise por um vício que era do próprio edital.\n\n' +
    'A impugnação existe para isso: apontar o defeito enquanto ainda dá tempo de ' +
    'corrigir. Bem feita, ela não trava o certame — organiza a disputa e protege ' +
    'quem joga limpo. O critério de julgamento menor preço não muda esse direito.\n\n' +
    'Impugnar não é atrasar. É garantir que a regra valha para todos.\n\n' +
    'Você já deixou de impugnar um edital por achar que "não valia a pena"?\n\n' +
    'Claudio Soares · OAB/RS 49.924\nConteúdo informativo. Não constitui consulta nem oferta de serviço.',
  hashtags: ['#licitacoes', '#lei14133', '#direitoadministrativo'],
}

const PLACEHOLDER_RENDER = 'demo/placeholder.png'

/** Cria o post de demonstração e retorna o post_id. */
export async function createDemoPost(): Promise<string> {
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .insert({
      title: DEMO.title,
      pillar: 'artigo_semana',
      caption: DEMO.caption,
      hashtags: DEMO.hashtags,
      status: 'draft',
    })
    .select()
    .single()
  if (postErr || !post) throw new Error(`Falha ao criar demo: ${postErr?.message}`)

  const slideRows = DEMO.slides.map((s, i) => ({
    post_id: post.id,
    position: i,
    template: s.template,
    eyebrow: s.eyebrow,
    title: s.title,
    body: s.body,
    citation: s.citation,
    alt_text: s.alt_text,
    // placeholder para o portão de agendamento (rendered_url not null). Substitua
    // rodando "Renderizar imagens" quando as fontes/assets estiverem no bucket.
    rendered_url: PLACEHOLDER_RENDER,
  }))
  const { error: slidesErr } = await supabase.from('slides').insert(slideRows)
  if (slidesErr) throw new Error(`Falha ao criar slides do demo: ${slidesErr.message}`)

  // Conformidade pré-semeada (o que a Camada 1 detectaria), sem Edge Function:
  //  • a citação do dispositivo BLOQUEIA até ser verificada;
  //  • "menor preço" é apenas AVISO — vocabulário nativo de licitações (§8).
  await supabase.from('citations').insert({
    post_id: post.id,
    raw_text: 'art. 164 da Lei 14.133/2021',
    kind: 'dispositivo',
    text_hash: 'demo', // recomputado para md5 pelo trigger ao verificar
    verified: false,
  })
  await supabase.from('compliance_flags').insert({
    post_id: post.id,
    rule: 'termo_ambiguo',
    layer: 'regex',
    severity: 'warn',
    excerpt: '…critério de julgamento menor preço não muda…',
    rationale: 'Termo nativo de licitações ("menor preço"). Só alerta — o titular decide.',
    resolved: false,
  })

  return post.id
}
