// ─────────────────────────────────────────────────────────────────────────────
// PORTÃO DE CONFORMIDADE — Camada 1, determinística (§8, recalibrada na v1.1)
//
// Roda no SERVIDOR. Norma de referência: Provimento CFOAB nº 205/2021 (Anexo
// Único) + Código de Ética e Disciplina da OAB.
//
// ⚠ O erro da v1 foi bloquear vocabulário nativo de licitações. `preço` aparece
//   em "critério de julgamento menor preço"; `garant` em "garantia da proposta"
//   e "garantia contratual" (arts. 96 e 98 da Lei 14.133/2021); `R$` em valor
//   estimado e nas faixas de dispensa. Esses termos são apenas WARN, nunca block.
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'block' | 'warn'
export type CitationKind = 'dispositivo' | 'acordao' | 'sumula' | 'outro'

export interface RegexFinding {
  rule: string
  layer: 'regex'
  severity: Severity
  excerpt: string
  rationale: string
}

export interface CitationCandidate {
  raw_text: string
  kind: CitationKind
}

export interface RegexResult {
  flags: RegexFinding[]
  citations: CitationCandidate[]
}

// Regras que geram CITAÇÕES (bloqueiam até verificar, via portão de trânsito).
const CITATION_RULES: {
  rule: string
  kind: CitationKind
  patterns: RegExp[]
}[] = [
  {
    rule: 'citacao_dispositivo',
    kind: 'dispositivo',
    patterns: [
      /art\.?\s*\d+[\wº°.-]*/gi,
      /Lei\s*n?º?\s*[\d.]+\/\d{4}/gi,
      /§\s*\d+/g,
    ],
  },
  {
    rule: 'citacao_sumula',
    kind: 'sumula',
    patterns: [/S[úu]mula\s*n?º?\s*\d+/gi],
  },
  {
    rule: 'citacao_acordao',
    kind: 'acordao',
    patterns: [
      /Ac[óo]rd[ãa]o\s*n?º?\s*[\d.\-/]+/gi,
      /\bTCU\b/g,
      /\bTCE\b/g,
      /\bSTJ\b/g,
      /\bSTF\b/g,
    ],
  },
]

// Regras que geram FLAGS de conformidade.
const FLAG_RULES: {
  rule: string
  severity: Severity
  patterns: RegExp[]
  rationale: string
}[] = [
  {
    rule: 'marcador_verificar',
    severity: 'block',
    patterns: [/\[VERIFICAR[^\]]*\]?/gi],
    rationale: 'Marcador de dispositivo não confirmado deixado pela IA. Substitua pela numeração correta ou remova.',
  },
  {
    rule: 'promessa_resultado',
    severity: 'block',
    patterns: [
      /garantimos/gi,
      /\bgaranto\b/gi,
      /resultado garantido/gi,
      /[êe]xito garantido/gi,
      /sempre vence/gi,
      /100\s*%\s*de\s*(?:[êe]xito|sucesso|aprova[çc][ãa]o)/gi,
      /n[ãa]o\s*perde\b/gi,
    ],
    rationale: 'Promessa de resultado vedada pelo art. 6º do Provimento 205/2021 e pelo Código de Ética.',
  },
  {
    rule: 'honorarios_oferta',
    severity: 'block',
    patterns: [
      /honor[áa]ri\w+\s*(?:a partir de|por|de\s*R\$)/gi,
      /valor da consulta/gi,
      /consulta\s*(?:gratuita|por)/gi,
      /pacote de/gi,
      /mensalidade/gi,
    ],
    rationale: 'Oferta de honorários/serviço. Conteúdo deve ser informativo, sem mercantilização (Provimento 205/2021).',
  },
  {
    rule: 'caso_concreto',
    severity: 'block',
    patterns: [
      /meu cliente/gi,
      /nosso cliente/gi,
      /atendemos a empresa/gi,
      /no caso que patrocinamos/gi,
      /processo n[º.]/gi,
    ],
    rationale: 'Referência a caso concreto identificável para oferta de atuação. Vedado (art. 6º, Provimento 205/2021).',
  },
  {
    rule: 'captacao',
    severity: 'warn',
    patterns: [/\bagende\b/gi, /\bcontrate\b/gi, /fale comigo agora/gi, /chame no direct/gi, /link na bio/gi, /me chama/gi],
    rationale: 'Possível captação de clientela. Reveja o tom — conteúdo informativo não convida à contratação.',
  },
  {
    rule: 'mercantilizacao',
    severity: 'warn',
    patterns: [/promo[çc][ãa]o/gi, /desconto/gi, /vagas limitadas/gi, /[úu]ltimas\b/gi, /imperd[íi]vel/gi, /\boferta\b/gi],
    rationale: 'Vocabulário de mercantilização. Impróprio para publicidade da advocacia.',
  },
  {
    rule: 'cifra_generica',
    severity: 'warn',
    patterns: [/R\$\s*[\d.,]*/g],
    rationale: 'Cifra em R$. Aceitável em valor estimado/faixa de dispensa; verifique se não é oferta de preço de serviço.',
  },
  {
    rule: 'termo_ambiguo',
    severity: 'warn',
    patterns: [/\bgarant\w+/gi, /\bpre[çc]o\b/gi],
    rationale: 'Termo nativo de licitações ("garantia da proposta", "menor preço"). Só alerta — o titular decide.',
  },
]

function excerptAround(text: string, matchIndex: number, matchLen: number): string {
  const pad = 24
  const start = Math.max(0, matchIndex - pad)
  const end = Math.min(text.length, matchIndex + matchLen + pad)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < text.length ? '…' : ''
  return (prefix + text.slice(start, end) + suffix).replace(/\s+/g, ' ').trim()
}

/** Executa a camada determinística sobre o texto completo do carrossel + legenda. */
export function runRegexLayer(text: string): RegexResult {
  const flags: RegexFinding[] = []
  const citations: CitationCandidate[] = []
  const seenCitations = new Set<string>()

  for (const cr of CITATION_RULES) {
    for (const pat of cr.patterns) {
      pat.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pat.exec(text)) !== null) {
        const raw = m[0].trim()
        const key = `${cr.kind}::${raw.toLowerCase()}`
        if (!seenCitations.has(key)) {
          seenCitations.add(key)
          citations.push({ raw_text: raw, kind: cr.kind })
        }
        if (m.index === pat.lastIndex) pat.lastIndex++ // evita loop em match vazio
      }
    }
  }

  for (const fr of FLAG_RULES) {
    const seen = new Set<string>()
    for (const pat of fr.patterns) {
      pat.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = pat.exec(text)) !== null) {
        const excerpt = excerptAround(text, m.index, m[0].length)
        const key = excerpt.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          flags.push({ rule: fr.rule, layer: 'regex', severity: fr.severity, excerpt, rationale: fr.rationale })
        }
        if (m.index === pat.lastIndex) pat.lastIndex++
      }
    }
  }

  return { flags, citations }
}
