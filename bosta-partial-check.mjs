// bosta-partial-check.mjs — Worker v3.19.0: «استرداد جزئي بوسطة» (§BOSTA-PARTIAL).
// تشغيل: node bosta-partial-check.mjs   (من غير شبكة — شوبيفاي وD1 وبوسطة وهمية)
// الأرقام من الحالات الحقيقية في D1/شوبيفاي (15-11-2026): #63994 (2500 → الباقي 500) · #64612 (2725 → 725) · #59117 (5125 → 3125) · #54860 (Returned).
import w from './index.js';

let ok = 0, bad = 0;
const eq = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) ok++; else { bad++; console.log('❌', name, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (name, c) => eq(name, !!c, true);

// ── شوبيفاي وهمية ────────────────────────────────────────────────
const TX = (id, amt, kind = 'SALE', status = 'SUCCESS') => ({ id: `gid://shopify/OrderTransaction/${id}`, kind, status, amt });
const mk = (id, name, out, o = {}) => ({ id, name, out, refunded: '0.0', courier: 'Bosta', s1: 'Delivered', s2: 'In-Return', cancelledAt: null, refundObjs: [], tx: [], ...o });
const SHOP = {};
const add = (o) => { SHOP[String(o.id)] = o; };
add(mk(19103443747138, '#63994', '-2500.0', { tx: [TX(1, '2675.0', 'SALE', 'PENDING'), TX(2, '2675.0')] }));
add(mk(19113553789250, '#64612', '-2725.0', { tx: [TX(3, '2925.0')] }));
add(mk(18929434394946, '#59117', '-5125.0', { s2: 'In-Return', tx: [TX(4, '5400.0')] }));       // مستحق 5125 · codRemainder المسجّل 3125 = 5125 − 2000
add(mk(18915406741826, '#54860', '-2500.0', { s2: 'Returned', tx: [TX(5, '2700.0')] }));        // Returned → ready بتحذير
add(mk(18913144832322, '#57212', '-2500.0', { s1: 'Shipped', tx: [TX(6, '2700.0')] }));         // S1 مش Delivered
add(mk(18912450445634, '#57101', '-2500.0', { s2: 'Confirmed + RETURN', tx: [TX(7, '2700.0')] })); // S2 مش في المسموح
add(mk(18914481144130, '#57377', '-500.0', { tx: [TX(8, '2700.0')] }));                          // جزء بوسطة اتسجّل (D1: bosta −2000) والباقي 500
add(mk(18916431233346, '#57634', '-3000.0', { tx: [TX(9, '3200.0')] }));                         // codRemainder 500 ≠ 1000 → سبب إجباري
add(mk(18921362161986, '#58207', '-2200.0', { tx: [TX(10, '2400.0')] }));                        // استبدال (Exchange)
add(mk(18928432578882, '#59021', '0.0', { tx: [TX(11, '2800.0')] }));                            // مفيش مستحق
add(mk(18918073205058, '#57833', '-2300.0', { refunded: '400.0', tx: [TX(12, '2700.0')] }));     // استرداد جزئي قبل كده + 3 رفعات
add(mk(18928574529858, '#59042', '-2700.0', { tx: [TX(13, '2700.0')], courier: 'Showroom' }));   // مندوب مش Bosta
add(mk(18936444617026, '#59971', '-2500.0', { tx: [TX(14, '2700.0')] }));                        // done (اتسجّل قبل كده)
add(mk(18936740217154, '#60015', '-2700.0', { tx: [TX(15, '2900.0')],                              // exists: شوبيفاي فيها الاسترداد بالملاحظة والـ D1 لأ
  refundObjs: [{ id: 'gid://shopify/Refund/777', note: 'Bosta partial refund 5513537751', totalRefundedSet: { shopMoney: { amount: '700.0' } } }] }));
add(mk(18928313598274, '#59006', '-2300.0', { tx: [TX(16, '2500.0')] }));                        // لإختبار فشل شوبيفاي
add(mk(18941560881474, '#60354', '-3400.0', { tx: [TX(17, '3600.0')] }));                        // لإختبار D1 وقعت بعد الاسترداد
add(mk(18943206621506, '#60518', '-2450.0', { tx: [TX(18, '2650.0')] }));                        // S1 check: حارس بوسطة
add(mk(70001, '#70001', '-2500.0', { tx: [TX(30, '2700.0')], t2: '9090909090' }));            // مفيش رفعة مقصوصة (بس عليه تتبع S2) → v3.21.0 manual
add(mk(70002, '#70002', '-2500.0', { tx: [TX(31, '2700.0')] }));                              // manual بلا تتبع S2
add(mk(70003, '#70003', '-2500.0', { tx: [TX(32, '2700.0')], t2: '9090909091', s1: 'Shipped' })); // manual · S1 مش Delivered
const byGid = {}; for (const o of Object.values(SHOP)) byGid[`gid://shopify/Order/${o.id}`] = o;
const refundsMade = [], gqlOps = []; let failRefund = false;
const nodeOf = (g, withTx) => { const o = byGid[g]; if (!o) return null; return {
  id: g, name: o.name, createdAt: '2026-10-20T10:00:00Z', cancelledAt: o.cancelledAt, displayFinancialStatus: 'PAID',
  totalOutstandingSet: { shopMoney: { amount: o.out } }, totalRefundedSet: { shopMoney: { amount: o.refunded } }, refunds: o.refundObjs,
  courier: o.courier ? { value: o.courier } : null, s1: o.s1 ? { value: o.s1 } : null, s2: o.s2 ? { value: o.s2 } : null, t1: null, t2: o.t2 ? { value: o.t2 } : null, t0: null,
  ...(withTx ? { transactions: o.tx.map(t => ({ id: t.id, kind: t.kind, status: t.status, amountSet: { shopMoney: { amount: t.amt } } })) } : {}),
}; };
// بوسطة (للاختبار ⑥ حارس bostaS1Check)
const BOSTA_FULL = { '8888888801': { trackingNumber: '8888888801', type: { code: 25 }, state: { code: 46 }, createdAt: '2026-11-01T10:00:00Z',
  wallet: { cashCycle: { total_amount: -2000, bosta_fees: '133.38', flex_ship_amount: '0.00', deposited_amt: -2133.38 }, cashout: { transaction_id: 'MONCOD10NOV26', transaction_date: '2026-11-10T00:00:00.000Z' } } } };
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes('/oauth/access_token')) return new Response(JSON.stringify({ access_token: 't' }), { status: 200 });
  if (u.includes('/graphql.json')) {
    const { query, variables } = JSON.parse(init.body);
    if (query.includes('bostaFind')) {
      const num = variables.q.replace('name:#', '');
      const o = Object.values(SHOP).find(x => x.name === `#${num}`);
      return new Response(JSON.stringify({ data: { orders: { nodes: o ? [{ id: `gid://shopify/Order/${o.id}`, name: o.name }] : [] } } }), { status: 200 });
    }
    if (query.includes('partialList')) { gqlOps.push('partialList'); return new Response(JSON.stringify({ data: { nodes: variables.ids.map(g => nodeOf(g, false)) } }), { status: 200 }); }
    if (query.includes('bostaOrders')) { gqlOps.push('bostaOrders'); return new Response(JSON.stringify({ data: { nodes: variables.ids.map(g => nodeOf(g, true)) } }), { status: 200 }); }
    if (query.includes('executeRefund')) {
      if (failRefund) return new Response(JSON.stringify({ data: { refundCreate: { refund: null, userErrors: [{ field: ['input'], message: 'Refund amount exceeds the refundable amount' }] } } }), { status: 200 });
      refundsMade.push(variables.input);
      const o = byGid[variables.input.orderId];
      const amt = variables.input.transactions.reduce((a, t) => a + parseFloat(t.amount), 0);
      const rid = `gid://shopify/Refund/${9000 + refundsMade.length}`;
      o.out = (parseFloat(o.out) + amt).toFixed(1); o.refunded = (parseFloat(o.refunded) + amt).toFixed(1);
      o.refundObjs.push({ id: rid, note: variables.input.note, totalRefundedSet: { shopMoney: { amount: amt.toFixed(1) } } });
      return new Response(JSON.stringify({ data: { refundCreate: { refund: { id: rid, totalRefundedSet: { shopMoney: { amount: amt.toFixed(1) } } }, userErrors: [] } } }), { status: 200 });
    }
  }
  if (u.startsWith('https://app.bosta.co/api/v2/')) {
    if (u.endsWith('/deliveries/search')) return new Response(JSON.stringify({ data: { deliveries: [{ trackingNumber: '8888888801', type: { code: 25 }, state: { code: 46 }, createdAt: '2026-11-01T10:00:00Z' }] } }), { status: 200 });
    const g = u.match(/deliveries\/business\/(\d+)$/);
    if (g && BOSTA_FULL[g[1]]) return new Response(JSON.stringify({ data: BOSTA_FULL[g[1]] }), { status: 200 });
  }
  return new Response('{}', { status: 404 });
};

// ── D1 وهمية ─────────────────────────────────────────────────────
const logs = [];            // صفوف logs (تحصيل + رفع)
let failLog = false;
const U = (oid, name, tn, remainder, o = {}) => logs.push({ id: logs.length + 1, timestamp: o.ts || '2026-11-10T08:00:00.000Z', tool: 'bosta_exchange_export', type: o.type || 'upload_re_return', employee: 'Ahmed_Ibraheem',
  order_id: `gid://shopify/Order/${oid}`, order_name: name, extra: JSON.stringify({ jobType: o.job || 'return', result: o.result || 'success', tracking_number: tn, codSent: -2000, codClipped: true, codRemainder: remainder }) });
U(19103443747138, '#63994', '4962164025', 500, { ts: '2026-11-15T08:23:40.000Z' });
U(19113553789250, '#64612', '5244341976', 725, { ts: '2026-11-11T16:04:03.000Z' });
U(18929434394946, '#59117', '9901609965', 3125, { ts: '2026-10-13T13:04:00.000Z' });
U(18915406741826, '#54860', '3021158862', 500, { ts: '2026-09-21T09:17:00.000Z' });
U(18913144832322, '#57212', '7845456495', 500);
U(18912450445634, '#57101', '677530852', 500);
U(18914481144130, '#57377', '7382989127', 500);
U(18916431233346, '#57634', '3151078493', 500);
U(18921362161986, '#58207', '2363496811', 200, { type: 'upload_re_exchange', job: 'exchange' });
U(18928432578882, '#59021', '6304725471', 800);
U(18918073205058, '#57833', '6699399398', 300, { ts: '2026-10-11T12:53:00.000Z' });
U(18918073205058, '#57833', '6202435640', 300, { ts: '2026-10-14T09:59:00.000Z' });
U(18918073205058, '#57833', '1383053709', 300, { ts: '2026-10-22T12:41:00.000Z' });
U(18918073205058, '#57833', '0000000000', 300, { ts: '2026-10-22T12:33:00.000Z', type: 're_upload_failed', result: 'error' });   // فاشلة — مش بتتحسب
U(18928574529858, '#59042', '4128651862', 700);
U(18936444617026, '#59971', '8072182999', 500);
U(18936740217154, '#60015', '5513537751', 700);
U(18928313598274, '#59006', '1352668601', 300);
U(18941560881474, '#60354', '5022387781', 1400);
U(18943206621506, '#60518', '8888888801', 450);
// صفوف تحصيل موجودة: بوسطة سجّلت جزء الـ 2000 على #57377، واستردادها الجزئي اتسجّل على #59971
logs.push({ id: logs.length + 1, timestamp: '2026-11-12T10:00:00.000Z', tool: 'cod_payment', type: 'refund', order_id: '18914481144130', order_name: '#57377', extra: JSON.stringify({ source: 'bosta_cash_cycle', slot: 'S2', grossCollected: '-2000.00', trackingNumber: '9000000099' }) });
logs.push({ id: logs.length + 1, timestamp: '2026-11-14T10:00:00.000Z', tool: 'cod_payment', type: 'refund', order_id: '18936444617026', order_name: '#59971', extra: JSON.stringify({ source: 'bosta_partial_refund', trackingNumber: '8072182999' }) });
const DB = { prepare: sql => ({ _b: [], bind(...a) { this._b = a; return this; },
  async run() { if (/INSERT INTO logs/.test(sql)) { if (failLog) throw new Error('D1 down'); const b = this._b; logs.push({ id: logs.length + 1, timestamp: b[0], tool: b[1], type: b[2], employee: b[3], order_id: b[4], order_name: b[5], value_after: b[10], notes: b[11], extra: b[12] }); } return {}; },
  async first() { return null; },
  async all() {
    if (/json_valid\(extra\) THEN json_extract\(extra,'\$\.codClipped'\)/.test(sql)) {
      const [tool, since, ...ids] = this._b;
      return { results: logs.filter(l => l.tool === tool && l.timestamp >= since && ['upload_re_return', 'upload_re_exchange'].includes(l.type) && JSON.parse(l.extra).codClipped === true && (!ids.length || ids.includes(l.order_id))).map(l => ({ ...l })) };
    }
    if (/SELECT id, timestamp, type, order_id, extra FROM logs/.test(sql)) {
      const [tool, since, ...ids] = this._b;
      return { results: logs.filter(l => l.tool === tool && l.timestamp >= since && ['payment', 'refund'].includes(l.type) && ids.includes(String(l.order_id))).map(l => ({ id: l.id, timestamp: l.timestamp, type: l.type, order_id: l.order_id, extra: l.extra })) };
    }
    if (/AS co,/.test(sql)) return { results: [] };                         // bostaFindByTracking
    if (/WHERE tool = \? AND order_id = \? AND timestamp >= \?/.test(sql)) return { results: [] };   // bostaOrderLegs
    if (/SELECT DISTINCT order_id FROM logs/.test(sql)) return { results: [] };
    return { results: [] };
  } }) };
const KV = { async get() { return null; }, async delete() {}, async list() { return { keys: [] }; } };
const env = { DB, PRE_REG_KV: KV, WORKER_SECRET: 's', SHOP_DOMAIN: 'x.myshopify.com', CLIENT_ID: 'a', CLIENT_SECRET: 'b', BOSTA_API_KEY: 'RAWKEY' };
const call = async (body, auth = 'Bearer s') => { const r = await w.fetch(new Request('https://x/', { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json', Origin: 'https://ecommoda-dev.github.io' }, body: JSON.stringify(body) }), env); return { status: r.status, body: await r.json() }; };
const list = async () => (await call({ action: 'bostaPartialList' })).body;
const check = async (ref, tn) => (await call({ action: 'bostaPartialCheck', orderRef: ref, ...(tn ? { trackingNumber: tn } : {}) })).body;
const item = (l, name) => l.items.find(x => x.orderName === name);
const PM = (i, wl) => ({ instapay: i, wallet: wl });
const pay = async (ref, tn, expected, extra = {}) => (await call({ action: 'bostaPartialPay', orderRef: ref, trackingNumber: tn, employee: 'Ahmed_Ibraheem', expected, ack: true, paymentMethods: PM('0.00', '0.00'), ...extra })).body;
const logsBefore = () => logs.length;

console.log('══ ① الطابور (bostaPartialList) ══');
const L = await list();
yes('نجح', L.success);
eq('سقف بوسطة معروض', L.cap, '2000.00');
eq('مصدر الطابور: كل أوردر مرة واحدة (#57833 له 3 رفعات ناجحة + 1 فاشلة)', L.items.filter(x => x.orderName === '#57833').length, 1);
eq('#57833: الرفعات الفاشلة ما بتتعدّش', item(L, '#57833').uploads.length, 3);
eq('الأحدث أولًا (#57833)', item(L, '#57833').tracking, '1383053709');
eq('بلا transactions في القايمة (سقف التكلفة)', gqlOps.includes('bostaOrders'), false);
const a = item(L, '#63994');
eq('#63994: ready', a.state, 'ready');
eq('#63994: المستحق 2500 · الباقي 500 (= المسجّل وقت الرفع)', [a.owed, a.remainder, a.codRemainder, a.needsReason], ['2500.00', '500.00', '500.00', false]);
eq('#63994: S1/S2', [a.s1, a.s2], ['Delivered', 'In-Return']);
eq('#63994: نوع الشحنة return', a.kind, 'return');
eq('#64612: الباقي 725', item(L, '#64612').remainder, '725.00');
eq('#59117: الباقي 3125 (5125 − 2000)', item(L, '#59117').remainder, '3125.00');
const rt = item(L, '#54860');
eq('#54860 (Returned): ready بتحذير', [rt.state, rt.warnings.some(x => /رجعت \(Returned\)/.test(x))], ['ready', true]);
eq('#58207: استبدال (Exchange) بنفس المنطق', [item(L, '#58207').kind, item(L, '#58207').state, item(L, '#58207').remainder], ['exchange', 'ready', '200.00']);
eq('S1 مش Delivered → blocked بسببه', [item(L, '#57212').state, /S1 = «Shipped»/.test(item(L, '#57212').blockers.join())], ['blocked', true]);
eq('S2 مش في المسموح → blocked بسببه', [item(L, '#57101').state, /S2 = «Confirmed \+ RETURN»/.test(item(L, '#57101').blockers.join())], ['blocked', true]);
eq('مندوب مش Bosta → blocked', [item(L, '#59042').state, /Showroom/.test(item(L, '#59042').blockers.join())], ['blocked', true]);
eq('مفيش مستحق → blocked', [item(L, '#59021').state, /مفيش مستحق/.test(item(L, '#59021').blockers.join())], ['blocked', true]);
const b57 = item(L, '#57377');
eq('جزء بوسطة اتسجّل (D1) → الباقي = المستحق كله', [b57.bostaRegistered, b57.owed, b57.remainder, b57.state], [true, '500.00', '500.00', 'ready']);
const m57 = item(L, '#57634');
eq('الباقي الحالي ≠ المسجّل وقت الرفع → needsReason + تحذير', [m57.remainder, m57.codRemainder, m57.needsReason, m57.warnings.some(x => /غير المسجّل وقت الرفع/.test(x))], ['1000.00', '500.00', true, true]);
eq('#59971: done (اتسجّل قبل كده)', item(L, '#59971').state, 'done');
const ex = item(L, '#60015');
eq('#60015: exists (استرداد شوبيفاي بالملاحظة بلا صف D1)', [ex.state, ex.existing.amount, ex.existing.refundId], ['exists', '700.00', 'gid://shopify/Refund/777']);
eq('الترتيب: ready أولًا ثم exists ثم blocked ثم done', L.items.map(x => x.state).join(',').replace(/(\w+)(,\1)+/g, '$1'), 'ready,exists,blocked,done');
yes('الرد مفيهوش حقول داخلية', !JSON.stringify(L).includes('_p') && !JSON.stringify(L).includes('"sales"'));
eq('القايمة ما كتبتش ولا لوج ولا استرداد', [refundsMade.length], [0]);

console.log('══ ② الفحص (bostaPartialCheck) ══');
const c1 = await check('#63994');
eq('#63994: ready بالمعاملات (max = المتاح للاسترداد ≥ الباقي)', [c1.state, c1.remainder, c1.max], ['ready', '500.00', '500.00']);
eq('#63994: الرفعة الصح', c1.tracking, '4962164025');
eq('رقم تتبع مش من الأوردر → خطأ', (await check('#63994', '1111111111')).success, false);
const noUp = await check('#70001');
eq('أوردر مفيهوش رفعة مقصوصة → خطأ بسببه', [noUp.success, /مفيهوش رفعة/.test(noUp.error || '')], [false, true]);
eq('أوردر مش موجود', (await check('#99999')).success, false);
eq('orderRef غير صالح → 400', (await call({ action: 'bostaPartialCheck', orderRef: 'abc' })).status, 400);
eq('بلا سر → 401', (await call({ action: 'bostaPartialCheck', orderRef: '#63994' }, 'Bearer x')).status, 401);

console.log('══ ③ التسجيل (bostaPartialPay) — الحالة الأساسية #63994 ══');
const exp1 = { remainder: '500.00', owed: '2500.00', s2: 'In-Return' };
let n0 = logsBefore();
let r = await pay('#63994', '4962164025', exp1, { ack: false, paymentMethods: PM('500.00', '0.00') });
eq('بلا إقرار → needsAck وصفر كتابة', [r.success, r.needsAck, refundsMade.length, logs.length - n0], [false, true, 0, 0]);
r = await pay('#63994', '4962164025', { ...exp1, remainder: '600.00' }, { paymentMethods: PM('500.00', '0.00') });
eq('باقي اتغيّر → stale', [r.success, r.stale, refundsMade.length], [false, true, 0]);
r = await pay('#63994', '4962164025', { ...exp1, s2: 'Returned' }, { paymentMethods: PM('500.00', '0.00') });
eq('S2 اتغيّر → stale', [r.stale], [true]);
r = await pay('#63994', '4962164025', exp1, { paymentMethods: PM('400.00', '0.00') });
eq('طرق الدفع ≠ الباقي → needsPayment', [r.success, r.needsPayment, refundsMade.length], [false, true, 0]);
r = await pay('#63994', '4962164025', exp1, { paymentMethods: { cash: '100.00', instapay: '400.00', wallet: '0.00' } });
eq('نقدي مرفوض (مفيش نقدي هنا)', [r.success, /مفيش نقدي/.test(r.error || ''), refundsMade.length], [false, true, 0]);
r = await pay('#63994', '4962164025', exp1, { paymentMethods: PM('300.00', '200.00'), paymentAccounts: { instapay: { 'فادي': '100.00' }, wallet: { 'إسلام': '200.00' } } });
eq('تفصيل الحسابات ≠ المبلغ → رفض', [r.success, r.needsPayment, refundsMade.length], [false, true, 0]);
r = await pay('#63994', '4962164025', exp1, { paymentMethods: PM('300.00', '200.00'), paymentAccounts: { instapay: { 'فادي': '100.00', 'مُرسل': '200.00' }, wallet: { 'إسلام': '200.00' } } });
eq('نجاح #63994', [r.success, r.status, r.amount, r.courier, r.refund.created], [true, 'success', '500.00', 'Ahmed Ibraheem', true]);
eq('شوبيفاي: استرداد واحد بالباقي فقط (مش 2500)', [refundsMade.length, refundsMade[0].transactions.reduce((a2, t) => a2 + parseFloat(t.amount), 0)], [1, 500]);
eq('ملاحظة الاسترداد = مفتاح عدم التكرار', refundsMade[0].note, 'Bosta partial refund 4962164025');
eq('الاسترداد على معاملة SALE الناجحة بس (مش PENDING)', refundsMade[0].transactions.map(t => t.parentId), ['gid://shopify/OrderTransaction/2']);
const row = logs[logs.length - 1], ex1 = JSON.parse(row.extra);
eq('صف D1 واحد بس اتكتب', logs.length - n0, 1);
eq('الصف: tool/type/employee/order', [row.tool, row.type, row.employee, row.order_id, row.order_name, row.value_after], ['cod_payment', 'refund', 'Ahmed_Ibraheem', '19103443747138', '#63994', 500]);
eq('الصف: علامة الخزنة source + جلسة مستقلة', [ex1.source, ex1.batchId, ex1.trackingNumber, ex1.slot], ['bosta_partial_refund', 'bosta-partial-4962164025', '4962164025', 'S2']);
eq('الصف: courier = اسم الموظف بمسافة · courierCollect سالب', [ex1.courier, ex1.courierCollect], ['Ahmed Ibraheem', -500]);
eq('الصف: batchExpected (جلسة كاملة بصف واحد)', ex1.batchExpected, { orders: 1, payOrders: 0, refundOrders: 1, collect: '-500.00', extraShippingTotal: '0.00', net: '-500.00' });
eq('الصف: طرق الدفع (مفيش نقدي)', ex1.paymentMethods, { cash: '0.00', instapay: '300.00', wallet: '200.00' });
eq('الصف: حسابات الدفع', ex1.paymentAccounts, { instapay: { 'فادي': '100.00', 'مُرسل': '200.00' }, wallet: { 'إسلام': '200.00' } });
eq('الصف: result success + isRefund', [ex1.result, ex1.isRefund, ex1.hasReturn], ['success', true, true]);
eq('الصف: تفاصيل الاسترداد', [ex1.partialRefund.remainder, ex1.partialRefund.owedBefore, ex1.partialRefund.shopifyRefundCreated, ex1.partialRefund.s1, ex1.partialRefund.s2], ['500.00', '2500.00', true, 'Delivered', 'In-Return']);
eq('الصف: ما فيهوش بيانات بوسطة (cashOutId · grossCollected · netValue)', [ex1.cashOutId, ex1.grossCollected, ex1.netValue].every(x => x === undefined), true);
eq('إعادة التسجيل = done (مفيش تكرار)', [(await pay('#63994', '4962164025', exp1, { paymentMethods: PM('500.00', '0.00') })).success, refundsMade.length, logs.length - n0], [false, 1, 1]);
eq('القايمة بعدها: #63994 done', item(await list(), '#63994').state, 'done');

console.log('══ ④ حالات تانية ══');
const base = refundsMade.length;
r = await pay('#57212', '7845456495', { remainder: '0.00', owed: '2500.00', s2: 'In-Return' }, { paymentMethods: PM('500.00', '0.00') });
eq('blocked (S1 Shipped) → رفض بسببه وصفر كتابة', [r.success, /S1 = «Shipped»/.test(r.error || ''), refundsMade.length], [false, true, base]);
// Returned (#54860): الإقرار موجود، التحذير بيرجع في النتيجة
r = await pay('#54860', '3021158862', { remainder: '500.00', owed: '2500.00', s2: 'Returned' }, { paymentMethods: PM('0.00', '500.00') });
eq('#54860 (Returned): بيتسجّل بـ status warning والتحذير بيرجع', [r.success, r.status, /Returned/.test(r.warning || '')], [true, 'warning', true]);
// سبب إجباري
const exM = { remainder: '1000.00', owed: '3000.00', s2: 'In-Return' };
r = await pay('#57634', '3151078493', exM, { paymentMethods: PM('1000.00', '0.00') });
eq('باقي ≠ المسجّل وقت الرفع بلا سبب → needsReason', [r.success, r.needsReason, refundsMade.length], [false, true, base + 1]);
r = await pay('#57634', '3151078493', exM, { paymentMethods: PM('1000.00', '0.00'), reason: 'ab' });
eq('سبب قصير (< 3 حروف) → needsReason', [r.needsReason], [true]);
r = await pay('#57634', '3151078493', exM, { paymentMethods: PM('1000.00', '0.00'), reason: 'العميل رجّع قطعة زيادة' });
eq('بسبب → نجاح والسبب متخزّن', [r.success, JSON.parse(logs[logs.length - 1].extra).partialRefund.reason], [true, 'العميل رجّع قطعة زيادة']);
// جزء بوسطة اتسجّل — الباقي = المستحق
r = await pay('#57377', '7382989127', { remainder: '500.00', owed: '500.00', s2: 'In-Return' }, { paymentMethods: PM('500.00', '0.00') });
eq('#57377: الباقي = المستحق (جزء بوسطة اتسجّل قبل كده)', [r.success, r.amount, JSON.parse(logs[logs.length - 1].extra).partialRefund.bostaPartRegistered], [true, '500.00', true]);
// exists: D1 بس بلا استرداد جديد
const bEx = refundsMade.length;
const ex60 = item(await list(), '#60015');
r = await pay('#60015', '5513537751', { remainder: ex60.remainder, owed: ex60.owed, s2: 'In-Return' }, { paymentMethods: PM('700.00', '0.00') });
eq('exists: D1 بس (بلا createRefund جديد) بمبلغ الاسترداد الموجود', [r.success, refundsMade.length, r.refund.created, r.amount], [true, bEx, false, '700.00']);
// فشل شوبيفاي = صفر كتابة
failRefund = true; const nF = logs.length;
r = await pay('#59006', '1352668601', { remainder: '300.00', owed: '2300.00', s2: 'In-Return' }, { paymentMethods: PM('300.00', '0.00') });
eq('شوبيفاي رفضت → صفر كتابة (لا D1 ولا استرداد)', [r.success, /شوبيفاي رفضت/.test(r.error || ''), logs.length - nF], [false, true, 0]);
failRefund = false;
// D1 وقعت بعد نجاح الاسترداد → refundCreated والإعادة آمنة
failLog = true; const bR = refundsMade.length;
r = await pay('#60354', '5022387781', { remainder: '1400.00', owed: '3400.00', s2: 'In-Return' }, { paymentMethods: PM('1400.00', '0.00') });
eq('D1 وقعت بعد الاسترداد → refundCreated:true', [r.success, r.refundCreated, refundsMade.length - bR], [false, true, 1]);
failLog = false;
const exAfter = item(await list(), '#60354');
eq('بعدها الأوردر بقى exists (الاسترداد اتعرف بالملاحظة)', [exAfter.state, exAfter.existing.amount], ['exists', '1400.00']);
r = await pay('#60354', '5022387781', { remainder: exAfter.remainder, owed: exAfter.owed, s2: 'In-Return' }, { paymentMethods: PM('1400.00', '0.00') });
eq('الإعادة: بتكتب D1 بس ومبتكرّرش الاسترداد', [r.success, refundsMade.length - bR, r.refund.created], [true, 1, false]);
eq('تحقق من الصف: 1400 · بدون استرداد جديد', [JSON.parse(logs[logs.length - 1].extra).partialRefund.shopifyRefundCreated, logs[logs.length - 1].value_after], [false, 1400]);

console.log('══ ⑤ حقول مطلوبة ══');
eq('بلا employee → 400', (await call({ action: 'bostaPartialPay', orderRef: '#63994', trackingNumber: '4962164025', expected: exp1 })).status, 400);
eq('بلا expected → 400', (await call({ action: 'bostaPartialPay', orderRef: '#63994', trackingNumber: '4962164025', employee: 'X' })).status, 400);
eq('trackingNumber غير صالح → 400', (await call({ action: 'bostaPartialPay', orderRef: '#63994', trackingNumber: 'x', employee: 'X', expected: exp1 })).status, 400);

console.log('══ ⑥ حارس bostaS1Check: اللي بوسطة دفعته = 2000 والمستحق أكبر ══');
const s1c = (await call({ action: 'bostaS1Check', orderRef: '#60518' })).body;
const crp = (s1c.candidates || []).find(x => x.trackingNumber === '8888888801');
yes('الفحص رجّع شحنة الـ CRP', !!crp);
eq('خطة الاسترداد: create بحد 2000 (مش 2450) وبخيار واحد', [crp.refund.state, crp.refund.need, crp.refund.owed, crp.refund.max, crp.refund.options], ['create', '2000.00', '2450.00', '2000.00', ['2000.00']]);
eq('cappedByBosta + الباقي للتاب الجديدة', [crp.refund.cappedByBosta, crp.refund.partialRemainder], [true, '450.00']);
const payS1 = await call({ action: 'bostaPayS1', orderRef: '#60518', trackingNumber: '8888888801', employee: 'Ahmed_Ibraheem',
  expected: { gross: crp.gross, net: crp.net, cashOutId: crp.cashOutId, owed: crp.refund.owed, refundState: 'create' }, refund: { amount: '2450.00', reason: 'اختبار', ack: true } });
// ملحوظة: ممكن يتمنع قبل كده بسبب بوابة S1 — المهم إن مفيش استرداد على شوبيفاي اتكتب بالمبلغ الكبير
eq('اختيار 2450 مرفوض — مفيش استرداد 2450 اتكتب', [payS1.body.success, refundsMade.every(x => x.transactions.reduce((a2, t) => a2 + parseFloat(t.amount), 0) !== 2450)], [false, true]);

console.log('══ ⑦ أوردر مضاف يدويًا من خارج الطابور (manual · v3.21.0) ══');
const mnl1 = (await call({ action: 'bostaPartialCheck', orderRef: '#70001', manual: true })).body;
eq('manual: ready بتتبع S2 من شوبيفاي', [mnl1.success, mnl1.manual, mnl1.state, mnl1.tracking, mnl1.kind], [true, true, 'ready', '9090909090', 'manual']);
eq('manual: المستحق 2500 · الباقي 500 · مفيش سبب إجباري', [mnl1.owed, mnl1.remainder, mnl1.codRemainder, mnl1.needsReason], ['2500.00', '500.00', null, false]);
yes('manual: تحذير «مضاف يدويًا»', mnl1.warnings.some(x => /مضاف يدويًا/.test(x)));
eq('بلا manual: نفس الأوردر لسه «مفيهوش رفعة» (السلوك القديم)', (await check('#70001')).success, false);
const mnl2 = (await call({ action: 'bostaPartialCheck', orderRef: '#70002', manual: true })).body;
eq('manual بلا تتبع S2 → خطأ بسببه', [mnl2.success, /bosta_tracking_number_s2/.test(mnl2.error || '')], [false, true]);
const mnl3 = (await call({ action: 'bostaPartialCheck', orderRef: '#70003', manual: true })).body;
eq('manual: نفس الموانع (S1 مش Delivered → blocked)', [mnl3.state, /S1 = «Shipped»/.test(mnl3.blockers.join())], ['blocked', true]);
eq('manual مع رقم تتبع غلط → خطأ', (await call({ action: 'bostaPartialCheck', orderRef: '#70001', manual: true, trackingNumber: '1111111111' })).body.success, false);
const mnlQ = (await call({ action: 'bostaPartialCheck', orderRef: '#64612', manual: true })).body;
eq('manual على أوردر في الطابور → بيتجاهَل (نفس رفعة الطابور)', [mnlQ.manual, mnlQ.kind, mnlQ.state], [false, 'return', 'ready']);
const expMnl = { remainder: '500.00', owed: '2500.00', s2: 'In-Return' };
const logN0 = logs.length, refN0 = refundsMade.length;
r = await pay('#70001', '9090909090', expMnl, { paymentMethods: PM('500.00', '0.00') });
eq('تسجيل بلا manual → مرفوض بلا كتابة', [r.success, refundsMade.length - refN0, logs.length - logN0], [false, 0, 0]);
r = await pay('#70001', '9090909090', expMnl, { manual: true, paymentMethods: PM('500.00', '0.00') });
eq('تسجيل manual ناجح', [r.success, r.amount, r.refund.created], [true, '500.00', true]);
eq('الاسترداد بالباقي بملاحظة التتبع', [refundsMade.length - refN0, refundsMade[refundsMade.length - 1].note], [1, 'Bosta partial refund 9090909090']);
const exRowMnl = JSON.parse(logs[logs.length - 1].extra);
eq('الصف: علامة الخزنة + manualAdded', [logs.length - logN0, exRowMnl.source, exRowMnl.batchId, exRowMnl.partialRefund.manualAdded, exRowMnl.partialRefund.jobKind, exRowMnl.courierCollect], [1, 'bosta_partial_refund', 'bosta-partial-9090909090', true, 'manual', -500]);
eq('بعد التسجيل: manual check بيرجّع done', (await call({ action: 'bostaPartialCheck', orderRef: '#70001', manual: true })).body.state, 'done');

console.log(`\n${bad ? '❌' : '✅'} ${ok} عدّى · ${bad} فشل`);
process.exit(bad ? 1 : 0);
