import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error, count } = await admin.from('advisor_profiles').select('*', { count: 'exact' }).limit(3)
console.log('count:', count, 'error:', error?.message)
if (data?.[0]) console.log('columns:', Object.keys(data[0]).join(', '))
console.log(JSON.stringify(data, null, 2))
