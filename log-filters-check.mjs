import { DatabaseSync } from 'node:sqlite';
import w from './index.js';
const db = new DatabaseSync(':memory:');
db.exec(`CREATE TABLE logs (id INTEGER PRIMARY KEY, timestamp TEXT, tool TEXT, type TEXT, employee TEXT, order_name TEXT, value_after TEXT, notes TEXT, extra TEXT)`);
let id=1; const ins=db.prepare('INSERT INTO logs VALUES (?,?,?,?,?,?,?,?,?)');
const add=(ts,type,order,val,batch)=>ins.run(id++,ts,'cod_payment',type,'emp',order,String(val),'',JSON.stringify({batchId:batch,courier:'C1'}));
// summer: 2026-07-10 12:30 Cairo = 09:30Z ; winter: 2026-11-02 12:30 Cairo = 10:30Z
add('2026-07-10T09:30:00.000Z','payment','#55001',500,'b1');
add('2026-07-10T09:31:00.000Z','payment','#55002',700,'b1');
add('2026-11-02T10:30:00.000Z','payment','#55003',300,'b2');
add('2026-11-02T10:40:00.000Z','refund','#55004',100,'b3');
add('2026-11-02T21:30:00.000Z','payment','#66000',50,'b4');   // 23:30 Cairo (winter)
add('2026-11-02T22:10:00.000Z','payment','#66001',60,'b5');   // 00:10 next day Cairo
const DB={prepare:sql=>({_b:[],bind(...a){this._b=a;return this},all(){return {results:db.prepare(sql).all(...this._b)}},first(){return db.prepare(sql).get(...this._b)}})};
const env={DB,WORKER_SECRET:'s'};
async function q(qs){const r=await w.fetch(new Request('https://x/?'+qs,{headers:{Authorization:'Bearer s',Origin:'https://ecommoda-dev.github.io'}}),env);return r.json();}
const names=async qs=>(await q('action=get_logs&'+qs)).entries?.map(e=>e.order_name).join(',');
let ok=0,bad=0;const eq=(n,a,b)=>{if(a===b){ok++}else{bad++;console.log('FAIL',n,'got',a,'want',b)}};
eq('all',await names(''),'#66001,#66000,#55004,#55003,#55002,#55001');
eq('orders tok','#55003,#55001'.split(',').sort().join(),(await names('orders=55001,55003')).split(',').sort().join());
eq('orders space','#55003,#55001'.split(',').sort().join(),(await names('orders=55001%2055003')).split(',').sort().join());
eq('time summer+winter 12:00-13:00', (await names('timeFrom=12:00&timeTo=13:00')).split(',').sort().join(), '#55001,#55002,#55003,#55004');
eq('time 23-24', await names('timeFrom=23:00&timeTo=23:59'),'#66000');
eq('time 00:00-01', await names('timeFrom=00:00&timeTo=01:00'),'#66001');
eq('date bound winter', await names('dateFrom=2026-11-03&dateTo=2026-11-03'),'#66001');  // 00:10 Cairo on 3rd (offset 2)
eq('date bound end', await names('dateFrom=2026-11-02&dateTo=2026-11-02'),'#66000,#55004,#55003');
eq('count=2', (await names('countFrom=2&countTo=2')).split(',').sort().join(),'#55001,#55002');
eq('count list 1', (await names('countIn=1')).split(',').sort().join(),'#55003,#55004,#66000,#66001');
eq('collect>=1000', (await names('collectFrom=1000')).split(',').sort().join(),'#55001,#55002');
eq('refund>=50', await names('refundFrom=50'),'#55004');
eq('collect list 300', await names('collectIn=300'),'#55003');
eq('combo count+type', await names('countIn=1&type=refund'),'#55004');
const s=await q('action=get_log_suggest&q=550');eq('suggest',s.suggestions.length+'/'+s.total,'4/4');
const s2=await q('action=get_log_suggest&q=550&exclude=55001');eq('suggest excl',s2.suggestions.length,3);
const nv=await q('action=get_log_num_values&field=count');eq('numvals',JSON.stringify(nv.values),JSON.stringify([{v:1,n:4},{v:2,n:1}]));
eq('count endpoint',(await q('action=get_logs_count&countIn=2')).total,2);
const ex=await q('action=get_logs_export&timeFrom=12:00&timeTo=13:00');eq('export',ex.total,4);
console.log('ok',ok,'bad',bad);
