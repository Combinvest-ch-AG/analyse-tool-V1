import { createClient } from '@supabase/supabase-js'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const advisorId = 'e62f4024-844b-4f2c-8040-b8233440e5ef'
const { data: prof } = await admin.from('advisor_profiles').select('email').eq('id', advisorId).maybeSingle()
const email = prof.email
const { data: list } = await admin.auth.admin.listUsers()
let user = list.users.find(u => u.email === email)
if (!user) { const { data } = await admin.auth.admin.createUser({ email, email_confirm: true }); user = data.user }
const { data } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
console.log('TH=' + data.properties?.hashed_token)
