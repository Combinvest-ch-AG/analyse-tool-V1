import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()
const app = await c.query(`select coalesce(application_name,'(none)') app, coalesce(usename,'?') usr, coalesce(host(client_addr),'local') addr, count(*), max(state) st from pg_stat_activity group by 1,2,3 order by count desc limit 15`)
console.log('=== BY APP/USER/ADDR ==='); app.rows.forEach(r=>console.log(`${r.count}x  app=${r.app}  user=${r.usr}  addr=${r.addr}`))

// snapshot set_config count, wait 10s, snapshot again -> live rate
const q = `select calls from pg_stat_statements where query ilike '%set_config%role%' order by calls desc limit 1`
const a = (await c.query(q)).rows[0].calls
await new Promise(r=>setTimeout(r,10000))
const b = (await c.query(q)).rows[0].calls
console.log(`\nset_config delta in 10s: ${b-a}  => ${((b-a)/10).toFixed(0)} req/s LIVE`)

// which queries grew most in that window? sample top by calls
const grew = await c.query(`select calls, left(query,70) q from pg_stat_statements order by calls desc limit 6`)
console.log('\n=== HIGHEST CALL COUNTS ==='); grew.rows.forEach(r=>console.log(r.calls, r.q.replace(/\s+/g,' ')))
await c.end()
