import { createClient } from '@supabase/supabase-js'

// Cliente do navegador. SOMENTE anon key pública. Nenhum token de serviço,
// nenhuma chave da Anthropic ou da Meta chega ao bundle (§12 critério 8).
const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  // Falha barulhenta em dev; nunca silencie configuração ausente.
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes — veja .env.example')
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})

/** Invoca uma Edge Function autenticada. A chave de IA/Meta vive só no servidor. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw error
  return data as T
}
