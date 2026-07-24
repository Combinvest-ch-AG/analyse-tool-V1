import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()

// 1. connections by state
const conns = await c.query(`select state, count(*) from pg_stat_activity group by state order by count desc`)
console.log('=== CONNECTIONS ==='); conns.rows.forEach(r=>console.log(r.state||'null', r.count))

// 2. long-running / active queries
const act = await c.query(`select pid, state, now()-query_start as dur, left(query,90) q from pg_stat_activity where state<>'idle' and query not ilike '%pg_stat_activity%' order by dur desc nulls last limit 8`)
console.log('\n=== ACTIVE QUERIES ==='); act.rows.forEach(r=>console.log(String(r.dur).slice(0,15), r.q.replace(/\s+/g,' ')))

// 3. pg_stat_statements top by total time (if available)
try {
  const st = await c.query(`select calls, round(total_exec_time::numeric,0) tot_ms, round(mean_exec_time::numeric,1) mean_ms, left(query,110) q from pg_stat_statements order by total_exec_time desc limit 12`)
  console.log('\n=== TOP STATEMENTS (by total time) ==='); st.rows.forEach(r=>console.log(`calls=${r.calls} tot=${r.tot_ms}ms mean=${r.mean_ms}ms | ${r.q.replace(/\s+/g,' ')}`))
} catch(e){ console.log('\npg_stat_statements not available:', e.message) }

await c.end()
