import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cliente do navegador. SOMENTE anon key pública. Nenhum token de serviço,
// nenhuma chave da Anthropic ou do Mixpost chega ao bundle (§12 critério 8).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// App real: o backend é obrigatório. Se faltar configuração, a UI mostra uma
// tela de "configure o Supabase" em vez de quebrar (ver App.tsx).
export const supabaseConfigured = Boolean(url && anon)

if (!supabaseConfigured) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — configure o .env (veja .env.example).')
}

// Caminho de publicação: 'meta' (padrão) usa o worker pg_cron + Meta Graph API
// (publish-due-posts) — grátis e sem App Review para a conta do próprio titular
// (app em modo de desenvolvimento). 'mixpost' delega o agendamento ao Mixpost.
export const publishProvider = ((import.meta.env.VITE_PUBLISH_PROVIDER as string) || 'meta').toLowerCase()

// Placeholders inertes evitam que createClient lance na inicialização quando a
// config está ausente; as chamadas só ocorrem depois do gate de configuração.
export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anon || 'anon-key-placeholder',
  { auth: { persistSession: true, autoRefreshToken: true } },
)

/** Invoca uma Edge Function autenticada. As chaves de IA/Mixpost vivem só no servidor. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw error
  return data as T
}
