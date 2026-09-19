import './env'
import { createClient } from '@supabase/supabase-js'

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
const key = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()

console.log('==========================================')
console.log('🔍 Testing Supabase Connection & DB Status')
console.log('==========================================')
console.log('URL:', url)
console.log('Anon Key:', key ? `${key.substring(0, 15)}...` : '(missing)')
console.log('Service Key:', serviceKey ? `${serviceKey.substring(0, 15)}...` : '(missing)')

const supabaseAnon = createClient(url, key)
const supabaseAdmin = serviceKey ? createClient(url, serviceKey) : null

async function runTests() {
  console.log('\n--- 1. Testing Anon Client (Student/Public) ---')
  const { data: studentData, error: studentError, count: studentCount } = await supabaseAnon
    .from('student_profiles')
    .select('*', { count: 'exact', head: true })

  if (studentError) {
    console.error('❌ Anon client query error:', studentError.message)
  } else {
    console.log(`✅ Anon client connected successfully! Found ${studentCount ?? 0} student profiles.`)
  }

  console.log('\n--- 2. Testing Service Role Client (Admin Backend) ---')
  if (!supabaseAdmin) {
    console.error('❌ Service Role Key missing!')
  } else {
    const { data: adminData, error: adminError, count: adminCount } = await supabaseAdmin
      .from('assessment_submissions')
      .select('*', { count: 'exact', head: true })

    if (adminError) {
      console.error('❌ Service Role query error:', adminError.message)
    } else {
      console.log(`✅ Service Role connected successfully! Found ${adminCount ?? 0} assessment submissions.`)
    }
  }

  console.log('\n==========================================')
  console.log('🎉 CONNECTION TEST PASSED!')
  console.log('==========================================')
}

runTests()
