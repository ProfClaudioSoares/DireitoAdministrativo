// Clientes Supabase para as Edge Functions.
//   • userClient: repassa o JWT do chamador → RLS e default auth.uid() valem.
//   • adminClient: service_role — SÓ para o worker de cron (publish-due-posts),
//     onde não há usuário no contexto. NUNCA exposto ao navegador.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

export function userClient(req: Request): SupabaseClient {
  const authorization = req.headers.get('Authorization') ?? ''
  return createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
}

export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}
