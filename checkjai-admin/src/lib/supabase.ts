import { createClient } from '@supabase/supabase-js'

const defaultUrl = 'https://rqikkloonzlhzcazyrvz.supabase.co'
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaWtrbG9vbnpsaHpjYXp5cnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MzQwNTIsImV4cCI6MjEwNTQxMDA1Mn0.jlBKrrlb5nq-qGt08WDaQPESSsawbDxqV1nq1K-aayM'
const defaultServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaWtrbG9vbnpsaHpjYXp5cnZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTgzNDA1MiwiZXhwIjoyMTA1NDEwMDUyfQ.9EGhpkwhrisrk5ga45GMGsnXPkGz7v_u53kBQAu0jtI'

const url = import.meta.env.VITE_SUPABASE_URL || defaultUrl
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || defaultServiceRoleKey

export const supabase = createClient(url, anonKey)

export const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

