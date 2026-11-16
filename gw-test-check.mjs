// gw-test-check.mjs — 🧪 تجربة gateway المؤقتة (`gwTestPay`) — هتتحذف مع الأكشن. تشغيل: node gw-test-check.mjs
import w from './index.js';
let ok = 0, bad = 0;
const eq = (n, g, x) => { if (JSON.stringify(g) === JSON.stringify(x)) ok++; else { bad++; console.log('❌', n, '\n  got ', JSON.stringify(g), '\n  want', JSON.stringify(x)); } };

let tags = ['TEST-DELETE-ME'], outstanding = '300.0', cancelled = null, posts = [], found = true;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/graphql.json')) {
    const { query } = JSON.parse(init.body);
    if (query.includes('getOrderByNumber')) return new Response(JSON.stringify({ data: { orders: { nodes: found ? [{ id: 'gid://shopify/Order/99', name: '#65982' }] : [] } } }), { status: 200 });
    if (query.includes('gwTestOrder')) return new Response(JSON.stringify({ data: { order: { name: '#65982', tags, cancelledAt: cancelled, displayFinancialStatus: 'PENDING', totalOutstandingSet: { shopMoney: { amount: outstanding } } } } }), { status: 200 });
  }
  if (u.includes('/transactions.json')) {
    const b = JSON.parse(init.body).transaction; posts.push(b);
    return new Response(JSON.stringify({ transaction: { id: 7, kind: b.kind, status: b.status, gateway: b.gateway, amount: b.amount, message: `Marked the ${b.gateway} payment as received`, parent_id: b.kind === 'sale' ? null : 555, manual_payment_gateway: true, payment_id: '#65982.1' } }), { status: 201 });
  }
  return new Response('{}', { status: 404 });
};
const env = { WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b' };
const call = async body => {
  const r = await w.fetch(new Request('https://w/', { method: 'POST', headers: { Authorization: 'Bearer s', 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'gwTestPay', ...body }) }), env);
  return r.json();
};

let d = await call({ orderName: '#65982', amount: '100', gateway: 'Bosta COD تجربة' });
eq('نجاح', [d.success, d.transaction?.gateway, d.transaction?.message], [true, 'Bosta COD تجربة', 'Marked the Bosta COD تجربة payment as received']);
eq('الطلب: capture/manual-gateway-string/المبلغ', [posts[0].kind, posts[0].gateway, posts[0].amount, posts[0].currency], ['capture', 'Bosta COD تجربة', '100.00', 'EGP']);

posts = [];
d = await call({ orderName: '65982', amount: '10', gateway: 'g', kind: 'sale' });
eq('kind=sale بيتبعت + parent_id في الرد', [posts[0].kind, d.transaction.parent_id], ['sale', null]);
d = await call({ orderName: '65982', amount: '10', gateway: 'g', kind: 'refund' });
eq('kind غريب ← capture (مش refund)', [posts[1].kind, d.transaction.parent_id], ['capture', 555]);

posts = []; tags = ['x'];
d = await call({ orderName: '65982', amount: '100', gateway: 'g' });
eq('بلا تاج = رفض بلا كتابة', [d.success, posts.length, /TEST-DELETE-ME/.test(d.error)], [false, 0, true]);
tags = ['TEST-DELETE-ME'];
d = await call({ orderName: '65982', amount: '301', gateway: 'g' });
eq('أكبر من المتبقي', [d.success, posts.length], [false, 0]);
d = await call({ orderName: '65982', amount: '0', gateway: 'g' });
eq('مبلغ صفر', [d.success, posts.length], [false, 0]);
d = await call({ orderName: '65982', amount: '10', gateway: '  ' });
eq('gateway فاضي', [d.success, posts.length], [false, 0]);
d = await call({ orderName: 'abc', amount: '10', gateway: 'g' });
eq('رقم غلط', [d.success, posts.length], [false, 0]);
cancelled = '2026-11-16'; d = await call({ orderName: '65982', amount: '10', gateway: 'g' });
eq('ملغي', [d.success, posts.length], [false, 0]); cancelled = null;
outstanding = '0.0'; d = await call({ orderName: '65982', amount: '10', gateway: 'g' });
eq('مفيش متبقي', [d.success, posts.length], [false, 0]); outstanding = '300.0';
found = false; d = await call({ orderName: '65982', amount: '10', gateway: 'g' });
eq('مش موجود', [d.success, posts.length], [false, 0]);

console.log(`\n${ok} عدّى · ${bad} فشل`); process.exit(bad ? 1 : 0);
