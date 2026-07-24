import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()
const q = `select xact_commit, xact_rollback, deadlocks, tup_returned, tup_fetched from pg_stat_database where datname=current_database()`
const a = (await c.query(q)).rows[0]
await new Promise(r=>setTimeout(r,8000))
const b = (await c.query(q)).rows[0]
const d = (k)=> Number(b[k])-Number(a[k])
console.log('over 8s:')
console.log('  commits:  ', d('xact_commit'), `(${(d('xact_commit')/8).toFixed(0)}/s)`)
console.log('  rollbacks:', d('xact_rollback'), `(${(d('xact_rollback')/8).toFixed(0)}/s)`)
console.log('  deadlocks:', d('deadlocks'))
console.log('  tup_returned:', d('tup_returned'), 'tup_fetched:', d('tup_fetched'))
// error-raising functions: check pg_stat_user_functions for save_analysis_snapshot
try {
  const fn = await c.query(`select funcname, calls, round(total_time::numeric,0) tot from pg_stat_user_functions where funcname ilike '%analysis%' or funcname ilike '%save%' order by calls desc limit 8`)
  console.log('\n=== FUNCTION CALL STATS ==='); fn.rows.forEach(r=>console.log(`${r.funcname}: calls=${r.calls} tot=${r.tot}ms`))
} catch(e){ console.log('func stats:', e.message) }
await c.end()
