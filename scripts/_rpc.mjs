import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()
const r = await c.query(`select calls, round(mean_exec_time::numeric,2) mean, left(query,240) q from pg_stat_statements where query ilike '%pgrst_call%' or query ilike '%p_analysis%' order by calls desc limit 6`)
r.rows.forEach(row=>console.log(`calls=${row.calls} mean=${row.mean}ms\n  ${row.q.replace(/\s+/g,' ')}\n`))
await c.end()
