import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: prof } = await admin.from('advisor_profiles').select('id,organization_id').eq('email','andy.straubhaar@combinvest.swiss').maybeSingle()
console.log('advisor id:', prof?.id, 'org:', prof?.organization_id)
const { data: an } = await admin.from('analyses').select('id,customer_id,title,advisor_id').limit(5)
console.log('sample analyses:', JSON.stringify(an, null, 2))
