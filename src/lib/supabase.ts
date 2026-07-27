import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createMockClient, mockInvoke } from './mockClient'

// Cliente do navegador. SOMENTE anon key pública. Nenhum token de serviço,
// nenhuma chave da Anthropic ou da Meta chega ao bundle (§12 critério 8).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Sinaliza se o backend real está configurado. Quando NÃO está, o app entra em
// MODO DEMO (cliente em memória, sem login) — navegável sem Supabase.
export const supabaseConfigured = Boolean(url && anon)
export const demoMode = !supabaseConfigured

if (demoMode) {
  console.warn('Sem VITE_SUPABASE_URL/ANON_KEY — rodando em MODO DEMO (dados em memória, sem backend).')
}

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : (createMockClient() as unknown as SupabaseClient)

/** Invoca uma Edge Function autenticada. A chave de IA/Meta vive só no servidor. */
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (demoMode) return mockInvoke<T>(name, body)
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw error
  return data as T
}
