import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(url ?? '', anonKey ?? '')

export const supabaseAdmin = serviceRoleKey
  ? createClient(url ?? '', serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : supabase
