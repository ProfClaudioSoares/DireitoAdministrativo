import { createClient } from '@supabase/supabase-js'

// Cliente do navegador. SOMENTE anon key pública. Nenhum token de serviço,
// nenhuma chave da Anthropic ou da Meta chega ao bundle (§12 critério 8).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Sinaliza se o ambiente está configurado. A UI usa isto para mostrar um aviso
// amigável em vez de quebrar com tela branca.
export const supabaseConfigured = Boolean(url && anon)

if (!supabaseConfigured) {
  console.warn(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — o app abre, mas login e ' +
      'dados não funcionam até configurar o .env (veja .env.example).',
  )
}

// Placeholders inertes evitam que createClient lance erro na inicialização
// (ele exige url/anon não vazios). Sem configuração, as chamadas simplesmente
// falham de forma tratada, em vez de derrubar a página inteira.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anon || 'public-anon-key-placeholder',
  { auth: { persistSession: true, autoRefreshToken: true } },
)

/** Invoca uma Edge Function autenticada. A chave de IA/Meta vive só no servidor. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw error
  return data as T
}
