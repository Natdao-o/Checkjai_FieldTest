import { createClient } from '@supabase/supabase-js'

const defaultUrl = 'https://rqikkloonzlhzcazyrvz.supabase.co'
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxaWtrbG9vbnpsaHpjYXp5cnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MzQwNTIsImV4cCI6MjEwNTQxMDA1Mn0.jlBKrrlb5nq-qGt08WDaQPESSsawbDxqV1nq1K-aayM'

const url = import.meta.env.VITE_SUPABASE_URL || defaultUrl
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey

export const supabase = createClient(url, anonKey)


/** ล็อกอินผ่าน `POST /api/auth/login` — DB: ตาราง `public.users` (student_id, password), RPC `login_user` */
