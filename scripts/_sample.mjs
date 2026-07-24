import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.POSTGRES_URL_NON_POOLING, ssl:{rejectUnauthorized:false} })
await c.connect()

// pg_cron jobs
try {
  const cron = await c.query(`select jobid, schedule, active, left(command,80) cmd from cron.job order by jobid`)
  console.log('=== CRON JOBS ==='); cron.rows.forEach(r=>console.log(`#${r.jobid} [${r.schedule}] active=${r.active} ${r.cmd.replace(/\s+/g,' ')}`))
  const runs = await c.query(`select jobid, status, count(*) from cron.job_run_details where start_time > now()-interval '5 min' group by 1,2 order by 3 desc limit 10`)
  console.log('--- runs last 5min ---'); runs.rows.forEach(r=>console.log(`job#${r.jobid} ${r.status} x${r.count}`))
} catch(e){ console.log('cron check:', e.message) }

// pg_net queue backlog
try {
  const net = await c.query(`select count(*) from net.http_request_queue`)
  console.log('\npg_net queue size:', net.rows[0].count)
} catch(e){ console.log('pg_net queue:', e.message) }

// rapid sample of active authenticator queries
console.log('\n=== IN-FLIGHT (rapid sample) ===')
const seen = {}
for(let i=0;i<40;i++){
  const r = await c.query(`select left(query,120) q from pg_stat_activity where usename='authenticator' and state='active' and query not ilike '%pg_stat_activity%'`)
  r.rows.forEach(row=>{ const k=row.q.replace(/\$\d+/g,'?').replace(/\s+/g,' ').trim(); seen[k]=(seen[k]||0)+1 })
  await new Promise(r=>setTimeout(r,50))
}
Object.entries(seen).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([q,n])=>console.log(`${n}x  ${q.slice(0,110)}`))
if(Object.keys(seen).length===0) console.log('(no active authenticator queries captured - requests may fail before query stage)')
await c.end()
