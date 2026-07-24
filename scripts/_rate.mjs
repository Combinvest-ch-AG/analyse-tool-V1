import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()
const reset = await c.query(`select stats_reset, now()-stats_reset as age from pg_stat_statements_info`)
console.log('stats_reset:', reset.rows[0]?.stats_reset, '| age:', String(reset.rows[0]?.age))
const top = await c.query(`select calls, round(total_exec_time::numeric,0) tot from pg_stat_statements where query ilike '%set_config%role%' order by calls desc limit 3`)
top.rows.forEach(r=>{
  console.log('set_config calls:', r.calls, 'total_ms:', r.tot)
})
// compute per-second rate
const ageSec = await c.query(`select extract(epoch from (now()-stats_reset)) as s from pg_stat_statements_info`)
const s = Number(ageSec.rows[0]?.s || 1)
const calls = Number(top.rows[0]?.calls || 0)
console.log('=> req/sec (avg since reset):', (calls/s).toFixed(1))
// GoTrue auth token refresh? check auth schema query volume
const auth = await c.query(`select calls, round(mean_exec_time::numeric,2) mean, left(query,80) q from pg_stat_statements where query ilike '%auth.%' or query ilike '%refresh_token%' order by calls desc limit 6`)
console.log('\n=== AUTH-RELATED ==='); auth.rows.forEach(r=>console.log('calls='+r.calls, 'mean='+r.mean, r.q.replace(/\s+/g,' ')))
await c.end()
