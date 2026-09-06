/**
 * cod-payment-center-worker  (v3.4.0)
 * skills: worker-builder v2.1.0 · constants v1.2.0 — 06-09-2026
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.4.0 — طرق الدفع بقت على مستوى **الصف** مش الجلسة (06-09-2026):
 *   🔴 العطل اللي البند ده بيقفله — جلسة `e1600f6c` بتاريخ 05-09-2026،
 *      المندوب Shady Mostafa: الجلسة كانت **أوردرين** كل واحد تحصيله 2,800،
 *      والموظف دخّل 2,675 نقدي + 2,925 محفظة = 5,600. أوردر منهم (#53322)
 *      فشل فماكتبش صف، والصف الناجح الوحيد (#53222) اتختم عليه **إجمالي
 *      الجلسة كامل**. النتيجة في D1 وفي تصدير الإكسيل: تحصيل 2,800 مقابل
 *      طرق دفع 5,600، من غير أي علامة إن الجلسة ناقصة. #53322 فضل PENDING
 *      على شوبيفاي والفلوس بتاعته اتسجّلت كأنها اتحصّلت.
 *   - 🔄 `buildPayExtra` بقى بياخد `orderMeta.paymentSplit` — حصة الأوردر ده
 *     هو بس من طرق الدفع — ويكتبها في `paymentMethods`. مجموع الصفوف
 *     المكتوبة بقى بيساوي المتحصَّل فعلاً مهما فشل غيره.
 *   - 🆕 `pmScope` في `extra` — `'order'` للصفوف الجديدة، `'session'` للقديمة.
 *     من غيره التجميع بيتكسر: الصفوف الأقدم كلها بتحمل **نفس** إجمالي
 *     الجلسة، فجمعها = مضروبة في عدد الصفوف.
 *   - 🆕 `sessionPaymentMethods` — إجمالي الجلسة كما دخّله الموظف، محفوظ زي
 *     ما هو. الفلوس اللي اتقبضت فعليًا مابتضيعش، بس بقت متميّزة عن المنسوب
 *     للصفوف المسجّلة.
 *   - 🆕 `batchExpected` — عدد الأوردرات وقيمة التحصيل اللي الجلسة **اتحققت
 *     عليها** قبل التنفيذ. ده اللي بيخلي أي جلسة ناقصة تتكشف من الصفوف
 *     نفسها: `Σ courierCollect` المكتوب ≠ `batchExpected.collect` = فشل
 *     مخفي. معروف وقت الطلب فبيتختم على كل صف من غير كتابة لاحقة.
 *   ⚠️ واجهة قديمة + Worker جديد = `paymentSplit` مش مبعوت → السلوك القديم
 *      بالظبط. الاتجاه التاني (واجهة جديدة + Worker قديم) بيتجاهل الحقول
 *      الجديدة **في صمت**، وده اللي `MIN_WORKER_VERSION` في الواجهة اتحطّ
 *      عشانه (worker-builder Step 4 — «الفشل الصامت بيحتاج حارس نسخة»).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.3.0 — حذف endpointين بلا وظيفة كانوا بيكتبوا في D1 (31-08-2026):
 *   - 🗑️ write_external_log — بوابة كتابة مفتوحة على جدول logs المشترك
 *     (أي tool وأي type، من غير أي تحقق)، ومستهلكها الوحيد
 *     (cod-pre-register-payment-worker) بقى عنده D1 binding خاص بيه.
 *   - 🗑️ import_logs — أداة ترحيل مؤقتة معلَّمة للحذف من 15-08-2026،
 *     اتشغّلت مرتين وضاعفت 925 صف في السجل المالي (2,351,344 ج وهميين).
 *     الصفوف المكررة اتشالت من D1 بنفس التاريخ.
 *   السبب الكامل لكل واحد مكتوب مكانه في §HANDLER.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.2.0 — إصلاح عطل التسجيل المسبق الصامت + diag/get_config (31-08-2026):
 *   - 🔴 §PREREG بقى بيقرا PRE_REG_KV **مباشرة** بدل نداء HTTP على
 *     cod-pre-register-payment-worker. تفاصيل العطل الكامل وتاريخه في بلوك
 *     §PREREG تحت — باختصار: الأداة اتنقلت لـ ecommoda-dev **واتغيّر اسمها**
 *     يوم 16-08-2026، وPREREG_WORKER_URL فضل على العنوان القديم، والـ
 *     try/catch حوّل كل فشل لـ null = "الأوردر مش مسجّل مسبقًا". 16 يوم صمت.
 *   - 🔴 checkPendingPreReg / listPendingPreReg بقوا **يرموا** عند فشل
 *     القراءة بدل ما يرجّعوا null/{}. فشل قراءة KV مش معناه "مفيش تسجيل
 *     مسبق" — الخلط ده هو العطل نفسه. (worker-builder Step 5A ⑥)
 *   - 🟡 clearPendingPreReg بيفضل غير قاتل (بيشتغل بعد ما الفلوس اتحصّلت)
 *     لكن بقى يرجّع false، والمنادي بيحط تحذير في الرد وفي notes بتاعة D1
 *     بدل ما الفشل يختفي. (Step 5A ④ + ⑦)
 *   - 🆕 ?action=diag و ?action=get_config — إلزاميان حسب worker-builder
 *     Step 5A ⑨ وماكانوش موجودين. diag بيكشف الـ bindings الناقصة
 *     والمتغيرات الملغاة اللي لسه في الداشبورد (ومنها العطل ده نفسه).
 *   - 🆕 ?action=audit_pending — **مؤقت**: جرد PRE_REG_KV قبل تنظيفها.
 *     🗑️ يتشال فور ما التنظيف يخلص.
 *   - 🗑️ اتشالوا خالص: PREREG_WORKER_URL · PREREG_WORKER_SECRET.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.1.0 — استيراد "تسليمات اليوم" بقراءة D1 مباشرة بدل الـ Service Binding
 * (31-08-2026):
 *   - 🔄 getCourierOrdersToday بقى بيقرا من D1 مباشرة بدل ما ينده
 *     order-status-updater-worker عبر Service Binding. الأداتين على **نفس**
 *     قاعدة D1 (ecommoda-dev-logs، binding: DB) — الاختلاف الوحيد قيمة عمود
 *     tool. فالنداء كان بيعدّي Worker تاني عشان يرجّع ليستة order_id بس، ولا
 *     حاجة تانية من رده كانت بتُستخدم. راجع §OSU-IMPORT للعقد الكامل ومخاطره.
 *   - 🔄 النطاق بقى **Delivered بس** — Returned اتشال بطلب صريح. الأوردر
 *     المرتجع بالكامل مالوش تحصيل، والاسترداد الجزئي بيوصل من مسار refund
 *     العادي مش من استيراد اليوم.
 *   - 🔄 فلتر النتيجة بقى ('success','warning') بدل 'success' بس. الـ warning
 *     معناه (حسب ecommoda-worker-builder Step 5A ④) إن الحالة اتكتبت على
 *     شوبيفاي فعلاً بس التحقق ما اكتملش — الأوردر متسلّم حقيقي، وإخفاؤه من
 *     ليستة التحصيل = فلوس مش بتتحصّل. الواجهة (importCalcStatusError) أصلاً
 *     بتمنع تحديد أي أوردر مش قابل للتحصيل.
 *   - 🗑️ اتشالوا خالص: OSU_WORKER_URL · OSU_WORKER_SECRET · OSU_SERVICE
 *     (Service Binding). شيلهم من الداشبورد **بعد** رفع النسخة دي، مش قبلها.
 *   - 🧹 ALLOWED_ORIGINS: اتشال الدومين المهجور ecommoda24.github.io والدومين
 *     غير الموثّق ahmedibraheemsb.github.io — فضل ecommoda-dev.github.io بس،
 *     وهو دلوقتي كمان قيمة الـ fallback في getCORS()/json().
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.0.0 — استيراد "تسليمات ومرتجعات اليوم" من Order Status Updater + ترقية
 * فلاتر تاب السجل (17-08-2026):
 *   - 🆕 action جديد getCourierOrdersToday — يجيب أوردرات مندوب اتسجّلت
 *     Delivered أو Returned (S1 أو S2) النهارده بس من سجل order-status-updater
 *     (Worker-to-Worker، مش قراءة مباشرة من D1 بتاعة أداة تانية — راجع §OSU-IMPORT).
 *     بيرجّع نفس شكل استجابة getCourierOrders بالظبط عشان الفرونت إند يستخدم
 *     نفس جدول الاستيراد من غير تعديل. عن قصد من غير فلترة canMarkAsPaid —
 *     الموظف لازم يشوف كل حركة اليوم (حتى Returned) ويقرر بنفسه.
 *   - 🆕 secrets جداد: OSU_WORKER_URL / OSU_WORKER_SECRET (نفس روح
 *     PREREG_WORKER_URL/SECRET الموجودين).
 *   - 🆕 getLogs/getLogsCount/getLogsExport بقوا يدعموا courier (اختيار متعدد،
 *     من extra.courier) + type (اختيار متعدد، عمود مباشر) + dateFrom/dateTo
 *     (تاريخ القاهرة) — نفس buildLogFilterSQL() المتبع في order-status-updater،
 *     مع فارق إن type هنا عمود D1 مباشر (مش محتاج json_extract).
 * ─────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ يحل محل الاتنين القديمين:
 *   - cod-payment-center-worker (KV/PRE_REG_KV مباشر + بدون login)
 *   - cod-payment-center-log-worker (KV logs منفصل)
 * دلوقتي كله جوه Worker واحد على D1 — يطابق قاعدة "ONE Worker per tool".
 *
 * Env bindings required (ecommoda-dev account):
 *   WORKER_SECRET        — secret للحماية (Bearer)
 *   SHOP_DOMAIN           — 6c7e1a-53.myshopify.com
 *   CLIENT_ID             — Shopify OAuth
 *   CLIENT_SECRET         — Shopify OAuth
 *   DB                    — D1 binding  → ecommoda-dev-logs
 *   PRE_REG_KV            — KV binding  → pre-register-payment-cod-KV
 *                           (نفس الـ namespace اللي بيكتب فيها
 *                            cod-pre-register-payment-worker — راجع §PREREG)
 *
 *   ⚠️ متغيرات ملغاة — امسحها من الداشبورد، ?action=diag بيفكّرك بيها:
 *      • PREREG_WORKER_URL · PREREG_WORKER_SECRET   (ملغاة في v3.2.0)
 *      • OSU_WORKER_URL · OSU_WORKER_SECRET
 *      • OSU_SERVICE — Service Binding              (ملغاة في v3.1.0)
 *
 * Routing:
 *   AUTH + LOG endpoints  → GET + ?action=... (المعيار الموحّد في كل الأدوات)
 *   Actions القديمة (preview/resolveByName/pay/refund/getCourierValues/getCourierOrders/getCourierOrdersToday)
 *     → فضلت POST + action في الـ body، عشان الـ HTML الحالي يفضل شغّال من غير تعديل
 *     لحد ما يتعمل rebuild للفرونت إند (login screen + employee tracking).
 *
 * D1: tool = 'cod_payment' | type = 'payment' / 'refund' / 'login' / 'logout'
 *     ⚠️ 'refund' قيمة جديدة — لازم تتضاف لجدول الـ tool/type values في Project Instructions.
 *
 * PRE_REG_KV: بقت مش موجودة هنا خالص — بدل ما نقرا/نمسح KV بتاعة أداة تانية مباشرة،
 *   بنكلم pre-register-payment-cod-worker عبر 3 endpoints جداد (checkPending / clearPending / listPending).
 *
 * Return/Exchange logic (زي ما هي):
 *   - returnShipping  ← من returns[].returnShippingFees (مش shippingLine)
 *   - returnedItems   ← من returns[].returnLineItems (qty سالب في الـ frontend)
 *   - hasReturn       ← true لو في returns
 *   - courierCollect  ← outstanding - returnShipping (سالب = ندفع للمندوب)
 */

// ══════════════════════════════════════════════════════
// §CONSTANTS
// ══════════════════════════════════════════════════════
const TOOL_NAME = 'cod_payment';

// مطلوب لـ ?action=get_config — الواجهة بتقارنه بنسختها وبتحذّر لو مختلفين
// (بيكشف Promote ناقص أو Worker شبح). worker-builder Step 5A ⑨.
const WORKER_VERSION = 'v3.4.0';

// Cairo = UTC+3 (DST active). ⚠️ Egypt DST ends 29-10-2026 → change to 2
// (نفس التغيير المطلوب في order-status-updater-worker — تغيير على مستوى الحزمة).
// مستخدم في: فلتر تاريخ تاب السجل (dateFrom/dateTo) + "اليوم" في §TODAY-IMPORT.
const CAIRO_OFFSET_HOURS = 3;

// ══════════════════════════════════════════════════════
// §CORS — Option B (أداة مالية: دفع + استرداد)
// ══════════════════════════════════════════════════════
// v3.1.0 — اتشال الدومين المهجور 'https://ecommoda24.github.io' والدومين غير
// الموثّق 'https://ahmedibraheemsb.github.io'. الواجهة الوحيدة للأداة دي:
// https://ecommoda-dev.github.io/COD-Payment-Center/Index.html
// ⚠️ العنصر [0] هو الـ fallback في getCORS() و json() — لازم يفضل دومين حقيقي.
const ALLOWED_ORIGINS = [
  'https://ecommoda-dev.github.io',
];
function getCORS(request) {
  const origin  = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

// ══════════════════════════════════════════════════════
// §HELPERS
// ══════════════════════════════════════════════════════
function json(data, status = 200, request = null) {
  const headers = { 'Content-Type': 'application/json' };
  Object.assign(headers, request ? getCORS(request) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0] });
  return new Response(JSON.stringify(data), { status, headers });
}

// ══════════════════════════════════════════════════════
// §SHARED — copy verbatim — never modify
// ══════════════════════════════════════════════════════
async function verifyEmployee(db, username, pin) {
  const row = await db.prepare(
    'SELECT display_name, is_active FROM employees WHERE username = ? AND pin = ?'
  ).bind(username, pin).first();

  if (!row) return null;
  if (!row.is_active) throw new Error('الحساب موقوف — تواصل مع المسؤول');

  db.prepare('UPDATE employees SET last_login = ? WHERE username = ?')
    .bind(new Date().toISOString(), username)
    .run()
    .catch(() => {});

  return row.display_name;
}

async function checkEmployee(db, username) {
  const row = await db.prepare(
    'SELECT is_active, pin FROM employees WHERE username = ?'
  ).bind(username).first();

  if (!row) return { exists: false, hasPin: false, isActive: false };
  return { exists: true, hasPin: !!row.pin, isActive: !!row.is_active };
}

async function registerPin(db, username, pin) {
  const row = await db.prepare(
    'SELECT pin, is_active FROM employees WHERE username = ?'
  ).bind(username).first();

  if (!row)           throw new Error('اسم المستخدم غير موجود');
  if (!row.is_active) throw new Error('الحساب موقوف — تواصل مع المسؤول');
  if (row.pin)        throw new Error('هذا المستخدم مسجّل بالفعل — تواصل مع المسؤول لإعادة الضبط');

  await db.prepare('UPDATE employees SET pin = ? WHERE username = ?').bind(pin, username).run();
  return true;
}

async function writeLog(db, entry) {
  await db.prepare(`
    INSERT INTO logs
      (timestamp, tool, type, employee, order_id, order_name,
       sku, product_title, delta, value_before, value_after, notes, extra)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    entry.timestamp    ?? new Date().toISOString(),
    entry.tool,
    entry.type,
    entry.employee     ?? null,
    entry.orderId      ?? null,
    entry.orderName    ?? null,
    entry.sku          ?? null,
    entry.productTitle ?? null,
    entry.delta        ?? null,
    entry.valueBefore  ?? null,
    entry.valueAfter   ?? null,
    entry.notes        ?? null,
    entry.extra ? JSON.stringify(entry.extra) : null
  ).run();
}

// ─── §SHARED::logFilters — shared WHERE-clause builder (v3.0.0) ───
// ⚠️ EXCEPTION عن قصد (زي نفس الاستثناء الموثّق في order-status-updater-worker):
// getLogs/getLogsCount/getLogsExport في الأداة دي بالذات اتعدّلوا لدعم فلاتر
// النوع/المندوب/فترة التاريخ في تاب السجل. لو الفلاتر دي هتتعمم على أدوات
// تانية في المستقبل، حدّث الـ shared template المركزي بدل ما تتكرر يدوي.
//
// فرق عن order-status-updater: type هنا عمود D1 مباشر (payment/refund) —
// مش محتاج json_extract زي status هناك. courier لسه جوه extra JSON بس
// (مفيش عمود مستقل ليه في جدول logs).
function parseListParam(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
}

// Cairo calendar day (YYYY-MM-DD) → UTC ISO bounds for that day
function cairoDayBoundsUTC(dateStr) {
  const startUTCms = new Date(`${dateStr}T00:00:00.000Z`).getTime() - CAIRO_OFFSET_HOURS * 3600 * 1000;
  const endUTCms   = new Date(`${dateStr}T23:59:59.999Z`).getTime() - CAIRO_OFFSET_HOURS * 3600 * 1000;
  return { start: new Date(startUTCms).toISOString(), end: new Date(endUTCms).toISOString() };
}

function buildLogFilterSQL({ tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null } = {}) {
  let sql = "FROM logs WHERE type NOT IN ('login','logout')";
  const b = [];

  if (tool) { sql += ' AND tool = ?'; b.push(tool); }

  const employees = parseListParam(employee);
  if (employees.length) {
    sql += ` AND employee IN (${employees.map(() => '?').join(',')})`;
    b.push(...employees);
  }

  const types = parseListParam(type);
  if (types.length) {
    sql += ` AND type IN (${types.map(() => '?').join(',')})`;
    b.push(...types);
  }

  const couriers = parseListParam(courier);
  if (couriers.length) {
    sql += ` AND json_extract(extra, '$.courier') IN (${couriers.map(() => '?').join(',')})`;
    b.push(...couriers);
  }

  if (search) {
    sql += ' AND (order_name LIKE ? OR notes LIKE ?)';
    b.push(`%${search}%`, `%${search}%`);
  }

  if (dateFrom) { const { start } = cairoDayBoundsUTC(dateFrom); sql += ' AND timestamp >= ?'; b.push(start); }
  if (dateTo)   { const { end }   = cairoDayBoundsUTC(dateTo);   sql += ' AND timestamp <= ?'; b.push(end); }

  return { sql, binds: b };
}

async function getLogs(db, {
  tool = null, employee = null, type = null, courier = null, search = null,
  dateFrom = null, dateTo = null, limit = 100, offset = 0,
} = {}) {
  const { sql: whereSql, binds } = buildLogFilterSQL({ tool, employee, type, courier, search, dateFrom, dateTo });
  const sql = `SELECT * ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  const b = binds.slice();
  b.push(Math.min(limit, 100), offset);
  return (await db.prepare(sql).bind(...b).all()).results;
}

async function getLogsCount(db, {
  tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null,
} = {}) {
  const { sql: whereSql, binds } = buildLogFilterSQL({ tool, employee, type, courier, search, dateFrom, dateTo });
  const row = await db.prepare(`SELECT COUNT(*) as total ${whereSql}`).bind(...binds).first();
  return row?.total ?? 0;
}

async function getLogsExport(db, {
  tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null,
} = {}) {
  const { sql: whereSql, binds } = buildLogFilterSQL({ tool, employee, type, courier, search, dateFrom, dateTo });
  const sql = `SELECT * ${whereSql} ORDER BY timestamp DESC LIMIT 2000`;
  return (await db.prepare(sql).bind(...binds).all()).results;
}

// ══════════════════════════════════════════════════════
// §PREREG — قراءة/مسح PRE_REG_KV مباشرة  (v3.2.0)
// ══════════════════════════════════════════════════════
// 📛 تاريخ عطل — اقراه قبل أي تعديل هنا:
//
// من v3.0.0 (15-08-2026) لحد v3.1.0، القراءة دي كانت بتعدّي على
// cod-pre-register-payment-worker عبر fetch() عام + PREREG_WORKER_SECRET.
// يوم 16-08-2026 الأداة دي اتنقلت من حساب ecommoda24 لـ ecommoda-dev
// **واتغيّر اسمها في نفس الوقت**:
//     pre-register-payment-cod-worker  →  cod-pre-register-payment-worker
// (والاسم الداخلي جوّه كودها لسه القديم لحد النهاردة — وده اللي ضلّل الجرد.)
// PREREG_WORKER_URL ما اتحدّثش، والـ try/catch اللي كان ملفوف حوالين النداء
// كان بيحوّل **أي** فشل لـ null — يعني "الأوردر مش مسجّل مسبقًا".
//
// النتيجة (متأكَّدة من D1): 81 عملية بـ preRegistered=true يوم 15-08 في
// نافذة 22 دقيقة، وبعدها **صفر من 4,145 عملية** على مدى 16 يوم — بينما
// التسجيل المسبق شغّال عادي (404 صف). أوردرات اتعرضت للموظف بالمستحق
// المتبقي بس بدل (المسجّل مسبقًا + المتبقي). مثال موثّق: #51693 — اتسجّل
// مقدّمًا 5,675 يوم 24-08، واتعرض للتحصيل 1,425 بدل 7,100.
//
// v3.2.0 بيشيل طبقة الـ HTTP كلها. الأداتين في نفس الحساب والـ KV
// namespace واحدة، فالربط المباشر أبسط وأسرع وبيشيل كمان
// PREREG_WORKER_SECRET (نسخة من سر أداة تانية — anti-patterns.md).
//
// 🔑 العقد مع cod-pre-register-payment-worker:
//     المفتاح = `preReg:<numericOrderId>`
//     القيمة  = JSON { orderId, orderName, amount, subtotal, shippingAmount,
//                      courier, lineItems[], preRegisteredAt, transactionId }
//     المنتج الوحيد   : cod-pre-register-payment-worker (action=preRegister)
//     المستهلك الوحيد : الأداة دي (بتقرا وبتمسح عند التحصيل)
// طابور تسليم بمنتج واحد ومستهلك واحد — المسح عند الاستهلاك سلوكه الطبيعي.
// ⚠️ أي تغيير في شكل القيمة هناك لازم يعدّي على هنا.
//
// 🔴 ممنوع الرجوع للـ try/catch اللي بيبلع الخطأ. فشل قراءة KV **مش**
// معناه "مش مسجّل مسبقًا" — الخلط بين الحالتين دول هو العطل نفسه.
// (ecommoda-worker-builder Step 5A ⑥: الفشل يترمي، ومفيش رسالة كاذبة.)
// ══════════════════════════════════════════════════════

const PREREG_PREFIX = 'preReg:';

// ─── §PREREG::assertPreRegKV ───
function assertPreRegKV(env) {
  if (!env.PRE_REG_KV) {
    throw new Error('KV binding "PRE_REG_KV" غير مضاف — تاب Bindings في إعدادات الـ Worker → KV namespace: pre-register-payment-cod-KV');
  }
}

// ─── §PREREG::checkPendingPreReg ───
// null = مفيش تسجيل مسبق فعلاً (الحالة الوحيدة). أي فشل بيترمي.
async function checkPendingPreReg(env, numericId) {
  assertPreRegKV(env);
  const raw = await env.PRE_REG_KV.get(PREREG_PREFIX + numericId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`تسجيل مسبق تالف للأوردر ${numericId} — القيمة في PRE_REG_KV مش JSON صالح`);
  }
}

// ─── §PREREG::clearPendingPreReg ───
// ⚠️ بيتنفّذ **بعد** ما الفلوس اتحصّلت فعلاً على شوبيفاي — فممنوع يرمي
// ويلغي الرد. لكن ممنوع كمان يختفي: بيرجّع false والمنادي بيحط تحذير في
// الرد وفي notes بتاعة D1. (Step 5A ④ نتيجة تلات حالات + ⑦ فشل يبان)
async function clearPendingPreReg(env, numericId) {
  try {
    assertPreRegKV(env);
    await env.PRE_REG_KV.delete(PREREG_PREFIX + numericId);
    return true;
  } catch (err) {
    console.warn('clearPendingPreReg failed:', err.message);
    return false;
  }
}

// ─── §PREREG::listPendingPreReg ───
// نداء واحد بدل N نداء جوه لوب getCourierOrders. بيرمي عند الفشل زي
// checkPendingPreReg بالظبط — قايمة فاضية غلط بتخفي كل التسجيلات المسبقة.
// ⚠️ الأداء دالة في عدد المفاتيح — لو الـ KV مليانة إدخالات بايتة، ده
// بيتحوّل لبطء على كل بحث مندوب. نظّفها (?action=audit_pending).
async function listPendingPreReg(env) {
  assertPreRegKV(env);
  const entries = {};
  let cursor;

  // سقف حماية 20 صفحة (≈20 ألف مفتاح) — مايفترضش إن الـ KV صغيرة
  for (let page = 0; page < 20; page++) {
    const list = await env.PRE_REG_KV.list({ prefix: PREREG_PREFIX, cursor });
    await Promise.all((list.keys || []).map(async (k) => {
      const raw = await env.PRE_REG_KV.get(k.name);
      if (!raw) return;
      try { entries[k.name.slice(PREREG_PREFIX.length)] = JSON.parse(raw); }
      catch { /* مفتاح تالف — بيظهر في audit_pending وبيتشال يدويًا */ }
    }));
    if (list.list_complete || !list.cursor) break;
    cursor = list.cursor;
  }
  return entries;
}

// ══════════════════════════════════════════════════════
// §TODAY-IMPORT — استيراد "تسليمات اليوم" من سجل Order Status Updater في D1
// ══════════════════════════════════════════════════════
// ⚠️⚠️ عقد عابر للأدوات — اقرا ده قبل أي تعديل هنا أو في order-status-updater.
//
// الأداتين على **نفس** قاعدة D1 (ecommoda-dev-logs · binding: DB · جدول logs).
// مفيش حاجة اسمها "D1 بتاعة أداة تانية" — فيه جدول واحد مشترك للستاك كله،
// والفرق الوحيد قيمة عمود `tool`. الأداة دي بتقرا نفس الجدول أصلاً في تاب
// السجل بتاعها (tool = 'cod_payment')؛ هنا بنقراه بـ tool = 'order_status'.
//
// اللي بنعتمد عليه من صفوف order-status-updater-worker — العقد بالحرف:
//   • tool              = 'order_status'
//   • type              ≠ 'login' / 'logout'   (صفوف تحديث الحالة نوعها 'update')
//   • order_id          — عمود مباشر: الـ ID الرقمي للأوردر
//   • extra.result      ∈ ('success','warning')     ← 'error' يتستبعد
//   • extra.courier     — اسم المندوب زي ما هو في custom.courier
//   • extra.targetLabel = 'Delivered'
//       أو — fallback للصفوف الأقدم من v3.1.0 بتاعة OSU، اللي كانت بتكتب
//       extra.specifier بدل extra.targetLabel — REPLACE(specifier,'_S2','')
//   • timestamp         — UTC ISO
//
// 🔴 الخطر المعروف والمقبول: الحقول دي **تفصيلة داخلية** في
// order-status-updater-worker، مالهاش عقد ولا إصدار. لو اتغيّر اسم حقل فيها
// أو بطّل يتكتب، الاستعلام ده هيرجّع ليستة **فاضية من غير أي خطأ** — والموظف
// هيشوف "مفيش أوردرات النهاردة" ويقفل من غير ما يحصّل. الأداة دي مالية.
// 🛡️ الحماية المتفق عليها (31-08-2026): تحذير مقابل مكتوب جوه
// order-status-updater-worker عند بناء الـ extra نفسه، وبيشاور على الملف ده.
// أي تعديل هناك لازم يعدّي على هنا الأول.
//
// ℹ️ نطاق: 'Delivered' حالة S1 نهائية (ecommoda-order-lifecycle) — مفيش
// Delivered في S2 أصلاً، فالـ REPLACE(...,'_S2','') للتماثل مع منطق OSU بس.
// ℹ️ Returned اتشال من النطاق في v3.1.0 بطلب صريح — الأوردر المرتجع مالوش
// تحصيل، والاسترداد بيمشي في مسار refund العادي مش في استيراد اليوم.
// ══════════════════════════════════════════════════════

// ─── §TODAY-IMPORT::todayCairoDate ───
// نفس منطق cairoDate() في order-status-updater-worker
function todayCairoDate() {
  const d = new Date(Date.now() + CAIRO_OFFSET_HOURS * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// ─── §TODAY-IMPORT::fetchTodayDeliveredOrderIds ───
// بيرجّع أرقام الأوردرات اللي اتسجّلت Delivered النهارده (بتوقيت القاهرة)
// للمندوب المطلوب. استعلام واحد على D1 — مفيش صفحات ولا سقف صفوف ولا نداء
// شبكة. الفهرس idx_logs_tool_ts (tool, timestamp DESC) بيغطي العمودين
// الانتقائيين، وفلاتر json_extract بتشتغل على النتيجة المضيّقة بعدهم.
async function fetchTodayDeliveredOrderIds(env, courier) {
  if (!env.DB) throw new Error('D1 binding "DB" غير مضاف — راجع تاب Bindings في إعدادات الـ Worker');

  const { start, end } = cairoDayBoundsUTC(todayCairoDate());

  const sql = `
    SELECT DISTINCT order_id
    FROM logs
    WHERE tool = 'order_status'
      AND type NOT IN ('login','logout')
      AND order_id IS NOT NULL
      AND json_extract(extra, '$.result') IN ('success','warning')
      AND json_extract(extra, '$.courier') = ?
      AND (
            json_extract(extra, '$.targetLabel') = 'Delivered'
         OR REPLACE(json_extract(extra, '$.specifier'), '_S2', '') = 'Delivered'
      )
      AND timestamp >= ? AND timestamp <= ?
  `;

  const rows = (await env.DB.prepare(sql).bind(courier, start, end).all()).results || [];
  return rows.map(r => String(r.order_id)).filter(Boolean);
}

// ══════════════════════════════════════════════════════
// §LOG-HELPERS
// ══════════════════════════════════════════════════════

// ─── §LOG-HELPERS::buildPayExtra ───
// بيبني الـ extra اللي بيتخزن مع كل صف pay/refund — batchId بيسمح للفرونت إند
// يجمّع كل أوردرات نفس جلسة التحصيل مع بعض في تاب السجل (Scenario C pattern).
// orderMeta: تفاصيل خاصة بالأوردر نفسه (lineItems/returnedItems/...) — بتيجي من
// الفرونت إند لأنه أصلاً عنده البيانات دي من نداء preview قبل كده؛ الـ Worker
// معملش استعلام تاني لشوبيفاي هنا عشان ميكررش نداء GraphQL تقيل من غير داعي.
// 🔴 v3.4.0 — `paymentMethods` بقى **حصة الصف** مش إجمالي الجلسة.
// السبب الكامل والحادثة في بلوك الرأس (§HEADER · v3.4.0). باختصار: الصف
// بيتكتب على النجاح بس، وطرق الدفع كانت بتتختم كاملة على كل صف — فأول ما
// أوردر يفشل، قيمته بتفضل في الصف الناجي كأنها اتحصّلت عليه.
//
// ⚠️ `pmScope` مش رفاهية — من غيره التجميع بيتكسر: كل الصفوف الأقدم من
//    v3.4.0 بتحمل **نفس** إجمالي الجلسة، فجمعها = مضروبة في عدد الصفوف.
//    المستهلك بيجمع الصفوف لما تكون 'order'، وبياخد أول صف لما تكون 'session'.
//
// ⚠️ `sessionPaymentMethods` بيحفظ إجمالي الجلسة كما دخّله الموظف. الفلوس
//    اللي اتقبضت فعليًا من المندوب مابتضيعش من السجل — بس بقت **متميّزة**
//    عن المنسوب للصفوف المسجّلة، والفرق بينهم هو الجلسة الناقصة نفسها.
//
// ⚠️ واجهة قديمة (بلا `paymentSplit`) → `pmScope:'session'` = السلوك القديم
//    بالظبط. الحماية في الاتجاه التاني عند الواجهة (`MIN_WORKER_VERSION`).
function buildPayExtra({ batchId, sessionMeta, orderMeta, courier, isRefund, refundAmount }) {
  const sm    = sessionMeta || {};
  const om    = orderMeta   || {};
  const split = om.paymentSplit || null;
  return {
    batchId:            batchId || null,
    courier:            courier || sm.courier || null,
    paymentMethods:        split || sm.paymentMethods || null,
    pmScope:               split ? 'order' : 'session',
    sessionPaymentMethods: sm.paymentMethods || null,
    batchExpected:         sm.batchExpected  || null,
    extraShipping:      sm.extraShipping || null,
    extraShippingTotal: sm.extraShippingTotal || null,
    isRefund:           !!isRefund,
    refundAmount:       refundAmount ?? null,
    lineItems:          om.lineItems || null,
    returnedItems:      om.returnedItems || null,
    orderDiscount:      om.orderDiscount ?? null,
    preRegistered:      om.preRegistered || false,
    hasReturn:          om.hasReturn || false,
    returnShipping:     om.returnShipping || null,
    courierCollect:     om.courierCollect ?? null,
  };
}

// ══════════════════════════════════════════════════════
// §SHOPIFY
// ══════════════════════════════════════════════════════

async function getAccessToken(env) {
  const res = await fetch(`https://${env.SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  return data.access_token || null;
}

async function getOrderDataById(env, numericId) {
  const token = await getAccessToken(env);
  if (!token) throw new Error('Failed to get Shopify access token');

  const query = `
    query getOrderById($id: ID!) {
      order(id: $id) {
        id
        name
        cancelledAt
        canMarkAsPaid
        displayFinancialStatus
        totalOutstandingSet { shopMoney { amount } }
        subtotalPriceSet    { shopMoney { amount } }
        shippingLine { originalPriceSet { shopMoney { amount } } }
        courierMeta: metafield(namespace: "custom", key: "courier")              { value }
        preRegMeta:  metafield(namespace: "custom", key: "pre_register_payment") { value }
        s1Meta:      metafield(namespace: "custom", key: "manual_status")        { value }
        s2Meta:      metafield(namespace: "custom", key: "status_2_r_e")         { value }

        discountApplications(first: 10) {
          edges {
            node {
              allocationMethod targetSelection targetType
              value {
                ... on MoneyV2               { amount currencyCode }
                ... on PricingPercentageValue { percentage }
              }
              ... on DiscountCodeApplication      { code }
              ... on AutomaticDiscountApplication { title }
              ... on ManualDiscountApplication    { description }
            }
          }
        }

        lineItems(first: 50) {
          nodes {
            sku quantity currentQuantity name
            originalUnitPriceSet  { shopMoney { amount } }
            discountedUnitPriceSet { shopMoney { amount } }
            discountedTotalSet     { shopMoney { amount } }
            discountAllocations {
              allocatedAmount { amount currencyCode }
              discountApplication { allocationMethod targetSelection targetType }
            }
          }
        }

        returns(first: 5) {
          nodes {
            id
            status
            returnShippingFees {
              amountSet { shopMoney { amount } }
            }
            returnLineItems(first: 20) {
              nodes {
                quantity
                ... on ReturnLineItem {
                  fulfillmentLineItem {
                    lineItem {
                      sku
                      name
                      originalUnitPriceSet  { shopMoney { amount } }
                      discountedUnitPriceSet { shopMoney { amount } }
                    }
                  }
                }
              }
            }
          }
        }

        refunds(first: 5) {
          id
          totalRefundedSet { shopMoney { amount } }
          refundLineItems(first: 20) {
            nodes {
              quantity
              priceSet { shopMoney { amount } }
              lineItem {
                sku
                name
                originalUnitPriceSet { shopMoney { amount } }
              }
            }
          }
        }

        transactions(first: 10) {
          id kind status
          amountSet { shopMoney { amount } }
        }
      }
    }
  `;

  const res = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body:    JSON.stringify({ query, variables: { id: `gid://shopify/Order/${numericId}` } }),
  });

  const data  = await res.json();
  const order = data?.data?.order;
  if (!order) return null;

  if (order.cancelledAt) {
    return {
      orderName:       order.name,
      cancelled:       true,
      cancelledAt:     order.cancelledAt,
      financialStatus: order.displayFinancialStatus,
      courier:         order.courierMeta?.value || null,
      s1:              order.s1Meta?.value      || null,
      s2:              order.s2Meta?.value      || null,
    };
  }

  const outstanding     = parseFloat(order.totalOutstandingSet?.shopMoney?.amount || '0');
  const subtotal        = parseFloat(order.subtotalPriceSet?.shopMoney?.amount    || '0');
  const shippingAmount  = parseFloat(order.shippingLine?.originalPriceSet?.shopMoney?.amount || '0');
  const canMarkAsPaid   = order.canMarkAsPaid;
  const financialStatus = order.displayFinancialStatus;
  const courier         = order.courierMeta?.value  || null;
  const preRegMetafield = order.preRegMeta?.value   || null;
  const s1              = order.s1Meta?.value        || null;
  const s2              = order.s2Meta?.value        || null;

  const returnsNodes = order.returns?.nodes || [];
  const hasReturn    = returnsNodes.length > 0;

  let returnShippingTotal = 0;
  const returnedItems = [];

  for (const ret of returnsNodes) {
    for (const fee of (ret.returnShippingFees || [])) {
      returnShippingTotal += parseFloat(fee.amountSet?.shopMoney?.amount || '0');
    }
    for (const rli of (ret.returnLineItems?.nodes || [])) {
      const li = rli.fulfillmentLineItem?.lineItem;
      if (!li) continue;
      returnedItems.push({
        sku:                 li.sku || '',
        name:                li.name || '',
        quantity:            rli.quantity,
        originalUnitPrice:   parseFloat(li.originalUnitPriceSet?.shopMoney?.amount || '0').toFixed(2),
        discountedUnitPrice: parseFloat(li.discountedUnitPriceSet?.shopMoney?.amount || '0').toFixed(2),
      });
    }
  }

  const returnShipping = returnShippingTotal.toFixed(2);

  const txns        = order.transactions || [];
  const saleTransactions = txns
    .filter(t => t.kind === 'SALE' && t.status === 'SUCCESS')
    .map(t => ({ id: t.id, amount: parseFloat(t.amountSet?.shopMoney?.amount || '0') }))
    .filter(t => t.amount > 0);

  let orderDiscountTotal = 0;
  const lineItems = (order.lineItems?.nodes || [])
    .filter(li => li.sku && li.currentQuantity > 0)
    .map(li => {
      const originalUnitPrice = parseFloat(li.originalUnitPriceSet?.shopMoney?.amount || '0');
      const qty               = li.currentQuantity;
      let lineLevelDiscount   = 0;
      let orderLevelDiscount  = 0;

      for (const alloc of (li.discountAllocations || [])) {
        const allocAmt = parseFloat(alloc.allocatedAmount?.amount || '0');
        const sel      = alloc.discountApplication?.targetSelection;
        if (sel === 'ALL') orderLevelDiscount += allocAmt;
        else               lineLevelDiscount  += allocAmt;
      }

      const unitDiscountTotal = lineLevelDiscount > 0 ? -(lineLevelDiscount / qty) : null;
      orderDiscountTotal += orderLevelDiscount;

      return {
        sku:          li.sku,
        quantity:     qty,
        name:         li.name,
        unitPrice:    originalUnitPrice.toFixed(2),
        unitDiscount: unitDiscountTotal !== null ? parseFloat(unitDiscountTotal.toFixed(2)) : null,
        totalPrice:   parseFloat(li.discountedTotalSet?.shopMoney?.amount || '0').toFixed(2),
      };
    });

  const orderDiscount = orderDiscountTotal > 0 ? parseFloat((-orderDiscountTotal).toFixed(2)) : null;

  let skipReason = null;
  if (!canMarkAsPaid) {
    if (outstanding < 0)                                      skipReason = 'مستحق استرداد';
    else if (outstanding === 0 || financialStatus === 'PAID') skipReason = 'مدفوع بالكامل';
    else                                                      skipReason = `لا يمكن الدفع (${financialStatus})`;
  }

  return {
    orderName: order.name, cancelled: false, cancelledAt: null,
    outstanding: outstanding.toFixed(2), subtotal: subtotal.toFixed(2), shippingAmount: shippingAmount.toFixed(2),
    canMarkAsPaid, skipReason, financialStatus, courier, preRegMetafield, s1, s2,
    lineItems, orderDiscount, hasReturn, returnShipping, returnedItems, saleTransactions,
  };
}

async function getOrderOutstanding(token, env, numericId) {
  const query = `
    query getOutstanding($id: ID!) {
      order(id: $id) { totalOutstandingSet { shopMoney { amount } } }
    }
  `;
  const res  = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body:    JSON.stringify({ query, variables: { id: `gid://shopify/Order/${numericId}` } }),
  });
  const data = await res.json();
  return parseFloat(data?.data?.order?.totalOutstandingSet?.shopMoney?.amount || '0');
}

async function getOrderIdByName(env, orderNumber) {
  const token = await getAccessToken(env);
  if (!token) throw new Error('Failed to get Shopify access token');

  const query = `
    query getOrderByNumber($query: String!) {
      orders(first: 1, query: $query) { nodes { id name } }
    }
  `;
  const res  = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body:    JSON.stringify({ query, variables: { query: `name:#${orderNumber}` } }),
  });
  const data   = await res.json();
  const orders = data?.data?.orders?.nodes;
  if (!orders || orders.length === 0) return null;
  return orders[0].id.replace('gid://shopify/Order/', '');
}

async function createTransaction(token, env, numericOrderId, amount) {
  const res = await fetch(
    `https://${env.SHOP_DOMAIN}/admin/api/2026-01/orders/${numericOrderId}/transactions.json`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body:    JSON.stringify({
        transaction: { kind: 'capture', status: 'success', amount, currency: 'EGP', gateway: 'manual' },
      }),
    }
  );
  const data = await res.json();
  if (res.ok && data.transaction?.id) return { success: true, transactionId: data.transaction.id };
  return { success: false, error: data.errors ? JSON.stringify(data.errors) : `HTTP ${res.status}` };
}

// ─── §SHOPIFY::allocateRefundTransactions ───
// بيوزّع مبلغ الاسترداد على كل الـ sale transactions الناجحة، كل واحدة لحد سقفها
// (المبلغ اللي هي فعلاً حصّلته) — عشان أوردرات الـ exchange اللي بتتحصّل على
// أكتر من transaction منفصلة (زي أوردر فيه استبدال زاد قيمته بعد التسليم).
// ⚠️ تبسيط معروف: مفروض إن مفيش استرداد جزئي سابق ضد نفس الـ transaction —
// بيحسب السقف = المبلغ الأصلي المحصّل، مش "المتبقي بعد استردادات سابقة".
function allocateRefundTransactions(saleTransactions, totalAmount) {
  let remaining = totalAmount;
  const alloc = [];
  for (const tx of saleTransactions) {
    if (remaining <= 0.001) break;
    const take = Math.min(remaining, tx.amount);
    if (take > 0.001) { alloc.push({ parentId: tx.id, amount: take.toFixed(2) }); remaining -= take; }
  }
  return { alloc, remaining };
}

async function createRefund(token, env, numericOrderId, saleTransactions, amount, currency) {
  const orderId      = `gid://shopify/Order/${numericOrderId}`;
  const totalAmount  = parseFloat(amount);
  const { alloc, remaining } = allocateRefundTransactions(saleTransactions || [], totalAmount);

  if (remaining > 0.01) {
    const capacity = (saleTransactions || []).reduce((s, t) => s + t.amount, 0).toFixed(2);
    return {
      success: false,
      error: `مجموع الـ transactions الناجحة (${capacity}) أقل من مبلغ الاسترداد المطلوب (${totalAmount.toFixed(2)}) — راجع الأوردر يدويًا على شوبيفاي`,
    };
  }

  const mutation = `
    mutation executeRefund($input: RefundInput!) {
      refundCreate(input: $input) {
        refund { id totalRefundedSet { shopMoney { amount currencyCode } } }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      orderId, currency,
      allowOverRefunding: false,
      notify:             false,
      note:               '',
      refundLineItems:    [],
      shipping:           { amount: '0.0' },
      transactions: alloc.map(a => ({ orderId, parentId: a.parentId, amount: a.amount, kind: 'REFUND', gateway: 'manual' })),
    },
  };

  const res = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body:    JSON.stringify({ query: mutation, variables }),
  });

  const data    = await res.json();
  const payload = data?.data?.refundCreate;

  if (payload?.userErrors?.length > 0)
    return { success: false, error: payload.userErrors.map(e => e.message).join(', ') };
  if (payload?.refund?.id)
    return { success: true, refundId: payload.refund.id, amount: payload.refund.totalRefundedSet?.shopMoney?.amount };
  return { success: false, error: 'No refund returned from Shopify' };
}

// ══════════════════════════════════════════════════════
// §HANDLER
// ══════════════════════════════════════════════════════
export default {
  async fetch(request, env) {
    // preflight — أولاً دايماً
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: getCORS(request) });

    // WORKER_SECRET — ثانياً دايماً
    const auth = request.headers.get('Authorization');
    if (!auth || auth !== `Bearer ${env.WORKER_SECRET}`) return json({ error: 'Unauthorized' }, 401, request);

    const url = new URL(request.url);
    let bodyData = {};
    if (request.method === 'POST') bodyData = await request.json().catch(() => ({}));
    // AUTH/LOG endpoints بيجوا GET+query — الـ actions القديمة بتفضل POST+body (توافق مع الفرونت إند الحالي)
    const action = url.searchParams.get('action') || bodyData.action || '';

    try {
      if (!action) return json({ error: 'action is required' }, 400, request);

      // ─── §AUTH ──────────────────────────────────────────────────
      if (action === 'check_employee') {
        const username = url.searchParams.get('username');
        if (!username) return json({ ok: false, error: 'username مطلوب' }, 400, request);
        const result = await checkEmployee(env.DB, username);
        return json({ ok: true, ...result }, 200, request);
      }

      if (action === 'register_pin') {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405, request);
        const { username, pin } = bodyData;
        if (!username || !pin) return json({ ok: false, error: 'username و pin مطلوبان' }, 400, request);
        await registerPin(env.DB, username, pin);
        return json({ ok: true }, 200, request);
      }

      if (action === 'verify_employee') {
        if (request.method !== 'POST') return json({ error: 'POST required' }, 405, request);
        const { username, pin } = bodyData;
        if (!username || !pin) return json({ ok: false, error: 'username و pin مطلوبان' }, 400, request);
        const displayName = await verifyEmployee(env.DB, username, pin);
        if (!displayName) return json({ ok: false, error: 'PIN خطأ أو المستخدم غير موجود' }, 401, request);
        await writeLog(env.DB, { tool: TOOL_NAME, type: 'login', employee: username, notes: `دخول: ${displayName}` });
        return json({ ok: true, displayName }, 200, request);
      }

      if (action === 'log_logout') {
        const username = url.searchParams.get('username');
        if (username) {
          await writeLog(env.DB, { tool: TOOL_NAME, type: 'logout', employee: username, notes: `خروج: ${username.replace(/_/g, ' ')}` });
        }
        return json({ ok: true }, 200, request);
      }

      if (action === 'get_employees') {
        const { results } = await env.DB.prepare(
          'SELECT username, display_name FROM employees WHERE is_active = 1 ORDER BY display_name'
        ).all();
        return json({ ok: true, employees: results }, 200, request);
      }
      // ──────────────────────────────────────────────────────────────

      // ─── §PAYMENT (الأكشنز الأصلية للأداة) ─────────────────────────
      const orderId  = bodyData.orderId;
      const numericId = orderId ? orderId.toString().trim() : null;
      const paymentActionsNeedOrderId = ['preview', 'pay', 'refund'];
      if (paymentActionsNeedOrderId.includes(action) && !numericId) {
        return json({ error: 'orderId is required' }, 400, request);
      }

      // ── ACTION: preview ───────────────────────────────────────────
      if (action === 'preview') {
        const [orderData, pending] = await Promise.all([
          getOrderDataById(env, numericId),
          checkPendingPreReg(env, numericId),
        ]);

        if (!orderData) return json({ success: false, notFound: true }, 200, request);

        if (orderData.cancelled) {
          return json({
            success: true, orderId: numericId, orderName: orderData.orderName,
            cancelled: true, cancelledAt: orderData.cancelledAt,
            financialStatus: orderData.financialStatus,
            courier: orderData.courier || null, s1: orderData.s1 || null, s2: orderData.s2 || null,
          }, 200, request);
        }

        if (pending) {
          const preRegAmount = parseFloat(pending.amount);

          if (orderData.hasReturn) {
            return json({
              success: true, orderId: numericId, orderName: orderData.orderName || pending.orderName,
              amount: pending.amount, subtotal: pending.subtotal, shippingAmount: pending.shippingAmount,
              canMarkAsPaid: true, skipReason: null, financialStatus: orderData.financialStatus,
              courier: orderData.courier || pending.courier, lineItems: pending.lineItems,
              orderDiscount: orderData.orderDiscount, preRegistered: true, registeredAt: pending.preRegisteredAt,
              cancelled: false, hasReturn: false, returnShipping: '0.00', returnedItems: [],
              saleTransactions: [], s1: orderData.s1, s2: null,
            }, 200, request);
          }

          const outstanding   = parseFloat(orderData.outstanding);
          const displayAmount = outstanding > 0 ? (preRegAmount + outstanding).toFixed(2) : pending.amount;

          return json({
            success: true, orderId: numericId, orderName: orderData.orderName || pending.orderName,
            amount: displayAmount, subtotal: pending.subtotal, shippingAmount: pending.shippingAmount,
            canMarkAsPaid: true, skipReason: null, financialStatus: orderData.financialStatus,
            courier: orderData.courier || pending.courier, lineItems: pending.lineItems,
            orderDiscount: orderData.orderDiscount, preRegistered: true, registeredAt: pending.preRegisteredAt,
            cancelled: false, hasReturn: false, returnShipping: '0.00', returnedItems: [],
            saleTransactions: [], s1: orderData.s1, s2: orderData.s2,
          }, 200, request);
        }

        if (orderData.preRegMetafield === 'Pre-Registered Payment') {
          return json({
            success: true, orderId: numericId, orderName: orderData.orderName,
            amount: orderData.outstanding, subtotal: orderData.subtotal, shippingAmount: orderData.shippingAmount,
            canMarkAsPaid: orderData.canMarkAsPaid, skipReason: orderData.skipReason || null,
            financialStatus: orderData.financialStatus, courier: orderData.courier, lineItems: orderData.lineItems,
            orderDiscount: orderData.orderDiscount, preRegistered: false, preRegisteredHistorically: true,
            cancelled: false, hasReturn: orderData.hasReturn, returnShipping: orderData.returnShipping,
            returnedItems: orderData.returnedItems, saleTransactions: orderData.saleTransactions || [],
            s1: orderData.s1, s2: orderData.s2,
          }, 200, request);
        }

        return json({
          success: true, orderId: numericId, orderName: orderData.orderName,
          amount: orderData.outstanding, subtotal: orderData.subtotal, shippingAmount: orderData.shippingAmount,
          canMarkAsPaid: orderData.canMarkAsPaid, skipReason: orderData.skipReason || null,
          financialStatus: orderData.financialStatus, courier: orderData.courier, lineItems: orderData.lineItems,
          orderDiscount: orderData.orderDiscount, preRegistered: false, cancelled: false,
          hasReturn: orderData.hasReturn, returnShipping: orderData.returnShipping, returnedItems: orderData.returnedItems,
          saleTransactions: orderData.saleTransactions || [], s1: orderData.s1, s2: orderData.s2,
        }, 200, request);
      }

      // ── ACTION: resolveByName ─────────────────────────────────────
      if (action === 'resolveByName') {
        const orderName = bodyData.orderName;
        if (!orderName) return json({ error: 'orderName is required' }, 400, request);
        const resolvedId = await getOrderIdByName(env, String(orderName).replace(/^#/, '').trim());
        if (!resolvedId) return json({ success: false, notFound: true }, 200, request);
        return json({ success: true, orderId: resolvedId }, 200, request);
      }

      // ── ACTION: pay ───────────────────────────────────────────────
      // batchId/sessionMeta (اختياريان): لو الفرونت إند بعتهم، بيتخزنوا جوه
      // extra عشان نقدر نجمّع كل أوردرات نفس جلسة التحصيل مع بعض في تاب السجل
      // (نفس نمط "Scenario C" المتبع في order-status-updater)
      if (action === 'pay') {
        const { amount, employee, orderName, batchId, sessionMeta, orderMeta } = bodyData;
        if (!amount) return json({ error: 'amount is required for pay action' }, 400, request);

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return json({ error: 'Invalid amount' }, 400, request);

        const pending = await checkPendingPreReg(env, numericId);
        if (pending) {
          const token = await getAccessToken(env);
          if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

          const outstanding = await getOrderOutstanding(token, env, numericId);

          if (outstanding > 0) {
            const txResult = await createTransaction(token, env, numericId, outstanding.toFixed(2));

            // 🐛 v3.2.0 — إصلاح: المسح اتنقل لبعد فحص نجاح المعاملة. قبل كده
            // كان بيتنفّذ قبلها، يعني معاملة فاشلة كانت بتمسح التسجيل المسبق
            // برضه = ضياع بيانات (الأوردر يفضل غير محصّل، والمبلغ المسجّل
            // مقدّمًا يختفي من KV خالص).
            if (!txResult.success) return json({ success: false, error: txResult.error }, 200, request);

            const cleared = await clearPendingPreReg(env, numericId);
            const warning = cleared ? null : 'التحصيل تم على شوبيفاي، لكن مسح التسجيل المسبق من PRE_REG_KV فشل — الأوردر ممكن يظهر تاني كـ"مسجل مسبقاً". امسح المفتاح يدويًا.';

            await writeLog(env.DB, {
              tool: TOOL_NAME, type: 'payment', employee: employee || null,
              orderId: numericId, orderName: orderName || pending.orderName || null,
              valueAfter: outstanding,
              notes: 'تحصيل (كان مسجل مسبقاً)' + (warning ? ` — ⚠ ${warning}` : ''),
              extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: pending.courier, isRefund: false }),
            });
            return json({
              success: true, orderId: numericId, preRegistered: true,
              amount: outstanding.toFixed(2), transactionId: txResult.transactionId,
              ...(warning ? { warning } : {}),
            }, 200, request);
          }

          const cleared = await clearPendingPreReg(env, numericId);
          const warning = cleared ? null : 'التحصيل تم على شوبيفاي، لكن مسح التسجيل المسبق من PRE_REG_KV فشل — الأوردر ممكن يظهر تاني كـ"مسجل مسبقاً". امسح المفتاح يدويًا.';

          await writeLog(env.DB, {
            tool: TOOL_NAME, type: 'payment', employee: employee || null,
            orderId: numericId, orderName: orderName || pending.orderName || null,
            valueAfter: 0,
            notes: 'مسجل مسبقاً — مفيش مستحق إضافي' + (warning ? ` — ⚠ ${warning}` : ''),
            extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: pending.courier, isRefund: false }),
          });
          return json({
            success: true, orderId: numericId, preRegistered: true, amount: '0.00',
            ...(warning ? { warning } : {}),
          }, 200, request);
        }

        const token = await getAccessToken(env);
        if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

        const txResult = await createTransaction(token, env, numericId, parsedAmount.toFixed(2));
        if (txResult.success) {
          await writeLog(env.DB, {
            tool: TOOL_NAME, type: 'payment', employee: employee || null,
            orderId: numericId, orderName: orderName || null,
            valueAfter: parsedAmount, notes: null,
            extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: sessionMeta?.courier, isRefund: false }),
          });
          return json({ success: true, orderId: numericId, transactionId: txResult.transactionId, amount: parsedAmount.toFixed(2) }, 200, request);
        }
        return json({ success: false, error: txResult.error }, 200, request);
      }

      // ── ACTION: refund ────────────────────────────────────────────
      if (action === 'refund') {
        const { refundAmount, saleTransactions, currency, employee, orderName, batchId, sessionMeta, orderMeta } = bodyData;
        if (!refundAmount)         return json({ error: 'refundAmount is required' }, 400, request);
        if (!Array.isArray(saleTransactions) || !saleTransactions.length)
          return json({ error: 'saleTransactions is required' }, 400, request);

        const parsedAmount = parseFloat(refundAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) return json({ error: 'Invalid refundAmount' }, 400, request);

        const token = await getAccessToken(env);
        if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

        const refundResult = await createRefund(token, env, numericId, saleTransactions, parsedAmount.toFixed(2), currency || 'EGP');

        if (refundResult.success) {
          await writeLog(env.DB, {
            tool: TOOL_NAME, type: 'refund', employee: employee || null,
            orderId: numericId, orderName: orderName || null,
            valueAfter: parsedAmount, notes: null,
            extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: sessionMeta?.courier, isRefund: true, refundAmount: parsedAmount }),
          });
          return json({ success: true, orderId: numericId, refundId: refundResult.refundId, amount: parsedAmount.toFixed(2) }, 200, request);
        }
        return json({ success: false, error: refundResult.error }, 200, request);
      }

      // ── ACTION: getCourierValues ──────────────────────────────────
      if (action === 'getCourierValues') {
        const query = `
          query {
            metafieldDefinitions(first: 50, ownerType: ORDER) {
              nodes { namespace key validations { name value } }
            }
          }
        `;
        const token = await getAccessToken(env);
        if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

        const res  = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        const defs = data?.data?.metafieldDefinitions?.nodes || [];
        const courierDef = defs.find(d => d.namespace === 'custom' && d.key === 'courier');
        if (!courierDef) return json({ success: true, values: [] }, 200, request);

        const choicesVal = courierDef.validations?.find(v => v.name === 'choices');
        let values = [];
        if (choicesVal?.value) { try { values = JSON.parse(choicesVal.value); } catch {} }
        return json({ success: true, values }, 200, request);
      }

      // ── ACTION: getCourierOrders ──────────────────────────────────
      // الفلتر: S1 = Delivered و (S2 فارغ أو S2 = Returned)
      if (action === 'getCourierOrders') {
        const { courier } = bodyData;
        if (!courier) return json({ error: 'courier is required' }, 400, request);

        const token = await getAccessToken(env);
        if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

        // نداء واحد بس يجيب كل الـ pending pre-registrations — بدل ما نسأل PRE_REG لكل أوردر لوحده
        const pendingMap = await listPendingPreReg(env);

        const queryStr = `metafields.custom.courier:"${courier}" AND (metafields.custom.manual_status:Delivered OR metafields.custom.manual_status:Returned) AND created_at:>=2026-04-01`;

        let fetchedOrders = [];
        let cursor = null;
        let hasNextPage = true;

        while (hasNextPage) {
          const gqlQuery = `
            query getOrders($query: String!, $after: String) {
              orders(first: 50, query: $query, after: $after) {
                pageInfo { hasNextPage endCursor }
                edges {
                  node {
                    id name canMarkAsPaid displayFinancialStatus createdAt
                    totalOutstandingSet { shopMoney { amount } }
                    subtotalPriceSet    { shopMoney { amount } }
                    shippingLine { originalPriceSet { shopMoney { amount } } }
                    shippingAddress { firstName lastName }
                    courierMeta: metafield(namespace: "custom", key: "courier")       { value }
                    s1Meta:      metafield(namespace: "custom", key: "manual_status") { value }
                    s2Meta:      metafield(namespace: "custom", key: "status_2_r_e")  { value }
                    lineItems(first: 50) {
                      nodes {
                        sku currentQuantity name
                        discountedUnitPriceSet { shopMoney { amount } }
                        discountedTotalSet     { shopMoney { amount } }
                      }
                    }
                  }
                }
              }
            }
          `;
          const res  = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query: gqlQuery, variables: { query: queryStr, after: cursor } }),
          });
          const data = await res.json();
          const ordersData = data?.data?.orders;
          if (!ordersData) return json({ success: false, error: 'Shopify query failed' }, 200, request);

          for (const edge of ordersData.edges) {
            const node        = edge.node;
            const nId          = node.id.replace('gid://shopify/Order/', '');
            const outstanding = parseFloat(node.totalOutstandingSet?.shopMoney?.amount || '0');
            const subtotal    = parseFloat(node.subtotalPriceSet?.shopMoney?.amount    || '0');
            const shipping    = parseFloat(node.shippingLine?.originalPriceSet?.shopMoney?.amount || '0');
            const addr        = node.shippingAddress;
            const customerName = addr?.firstName ? `${addr.firstName} ${addr.lastName || ''}`.trim() : '—';
            const s1          = node.s1Meta?.value || null;
            const s2          = node.s2Meta?.value || null;

            const lineItems = (node.lineItems?.nodes || [])
              .filter(li => li.sku && li.currentQuantity > 0)
              .map(li => ({
                sku:        li.sku,
                quantity:   li.currentQuantity,
                name:       li.name,
                unitPrice:  parseFloat(li.discountedUnitPriceSet?.shopMoney?.amount || '0').toFixed(2),
                totalPrice: parseFloat(li.discountedTotalSet?.shopMoney?.amount     || '0').toFixed(2),
              }));

            const pending = pendingMap[nId];
            let preRegistered   = false;
            let amountToCollect = outstanding;
            let displaySubtotal = subtotal;
            let displayShipping = shipping;
            let displayItems    = lineItems;

            if (pending) {
              preRegistered    = true;
              amountToCollect  = parseFloat(pending.amount);
              displaySubtotal  = parseFloat(pending.subtotal);
              displayShipping  = parseFloat(pending.shippingAmount);
              displayItems     = pending.lineItems || lineItems;
            }

            const isRefundCandidate = outstanding < 0;
            if (!node.canMarkAsPaid && !preRegistered && !isRefundCandidate) continue;
            if (s2 && s2 !== 'Returned') continue;

            fetchedOrders.push({
              id: nId, orderId: nId, orderName: node.name,
              amount: amountToCollect.toFixed(2), subtotal: displaySubtotal.toFixed(2), shippingAmount: displayShipping.toFixed(2),
              customerName, courier: node.courierMeta?.value || courier, createdAt: node.createdAt,
              lineItems: displayItems, preRegistered, s1, s2,
            });
          }

          hasNextPage = ordersData.pageInfo.hasNextPage;
          cursor      = ordersData.pageInfo.endCursor;
        }

        return json({ success: true, orders: fetchedOrders, count: fetchedOrders.length }, 200, request);
      }

      // ── ACTION: getCourierOrdersToday — تسليمات اليوم من سجل D1 ──
      // ⚠️ اسم الـ action محفوظ زي ما هو عن قصد — الفرونت إند الحالي بيناديه
      // بالاسم ده. النطاق بقى Delivered بس من v3.1.0 (Returned اتشال).
      //
      // نفس شكل استجابة getCourierOrders بالظبط (id/orderId/orderName/amount/
      // subtotal/shippingAmount/customerName/courier/createdAt/lineItems/
      // preRegistered/s1/s2) عشان الفرونت إند يستخدم نفس جدول الاستيراد وأدواته
      // (importRenderTable/importMakeRow/importCalcStatusError) من غير أي تعديل.
      //
      // ⚠️ عن قصد بدون فلترة canMarkAsPaid هنا (بعكس getCourierOrders) — أي
      // أوردر اتسجّل Delivered النهارده بيتعرض للموظف حتى لو مش قابل للتحصيل
      // فعلياً (مثلاً اترد بالكامل بعد التسليم على S2)، عشان يشوف الحركة بنفسه
      // ويقرر. importCalcStatusError() في الفرونت إند بيمنع تحديد/إضافة أي
      // أوردر مش قابل للتحصيل تلقائياً برضو (checkbox معطّل + خط أحمر).
      if (action === 'getCourierOrdersToday') {
        const { courier } = bodyData;
        if (!courier) return json({ error: 'courier is required' }, 400, request);

        const token = await getAccessToken(env);
        if (!token) return json({ success: false, error: 'Failed to get Shopify access token' }, 200, request);

        let orderIds;
        try {
          orderIds = await fetchTodayDeliveredOrderIds(env, courier);
        } catch (err) {
          return json({ success: false, error: `تعذّر قراءة سجل تحديث الحالة من D1: ${err.message}` }, 200, request);
        }
        if (!orderIds.length) return json({ success: true, orders: [], count: 0 }, 200, request);

        const pendingMap = await listPendingPreReg(env);
        const fetchedOrders = [];

        const gqlQuery = `
          query getOrdersByIds($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Order {
                id name canMarkAsPaid displayFinancialStatus createdAt
                totalOutstandingSet { shopMoney { amount } }
                subtotalPriceSet    { shopMoney { amount } }
                shippingLine { originalPriceSet { shopMoney { amount } } }
                shippingAddress { firstName lastName }
                courierMeta: metafield(namespace: "custom", key: "courier")       { value }
                s1Meta:      metafield(namespace: "custom", key: "manual_status") { value }
                s2Meta:      metafield(namespace: "custom", key: "status_2_r_e")  { value }
                lineItems(first: 50) {
                  nodes {
                    sku currentQuantity name
                    discountedUnitPriceSet { shopMoney { amount } }
                    discountedTotalSet     { shopMoney { amount } }
                  }
                }
              }
            }
          }
        `;

        // batching بـ 50 ID لكل نداء — نفس سقف lineItems(first:50) المستخدم
        // في باقي الأداة، وكفاية جداً لحجم أوردرات مندوب واحد في يوم واحد.
        for (let i = 0; i < orderIds.length; i += 50) {
          const chunk = orderIds.slice(i, i + 50).map(id => `gid://shopify/Order/${id}`);
          const res   = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query: gqlQuery, variables: { ids: chunk } }),
          });
          const data  = await res.json();
          const nodes = data?.data?.nodes || [];

          for (const node of nodes) {
            if (!node?.id) continue; // null = أوردر محذوف/غير متاح
            const nId = node.id.replace('gid://shopify/Order/', '');
            const outstanding = parseFloat(node.totalOutstandingSet?.shopMoney?.amount || '0');
            const subtotal     = parseFloat(node.subtotalPriceSet?.shopMoney?.amount    || '0');
            const shipping     = parseFloat(node.shippingLine?.originalPriceSet?.shopMoney?.amount || '0');
            const addr         = node.shippingAddress;
            const customerName = addr?.firstName ? `${addr.firstName} ${addr.lastName || ''}`.trim() : '—';
            const s1 = node.s1Meta?.value || null;
            const s2 = node.s2Meta?.value || null;

            const lineItems = (node.lineItems?.nodes || [])
              .filter(li => li.sku && li.currentQuantity > 0)
              .map(li => ({
                sku:        li.sku,
                quantity:   li.currentQuantity,
                name:       li.name,
                unitPrice:  parseFloat(li.discountedUnitPriceSet?.shopMoney?.amount || '0').toFixed(2),
                totalPrice: parseFloat(li.discountedTotalSet?.shopMoney?.amount     || '0').toFixed(2),
              }));

            const pending = pendingMap[nId];
            let preRegistered   = false;
            let amountToCollect = outstanding;
            let displaySubtotal = subtotal;
            let displayShipping = shipping;
            let displayItems    = lineItems;

            if (pending) {
              preRegistered   = true;
              amountToCollect = parseFloat(pending.amount);
              displaySubtotal = parseFloat(pending.subtotal);
              displayShipping = parseFloat(pending.shippingAmount);
              displayItems    = pending.lineItems || lineItems;
            }

            fetchedOrders.push({
              id: nId, orderId: nId, orderName: node.name,
              amount: amountToCollect.toFixed(2), subtotal: displaySubtotal.toFixed(2), shippingAmount: displayShipping.toFixed(2),
              customerName, courier: node.courierMeta?.value || courier, createdAt: node.createdAt,
              lineItems: displayItems, preRegistered, s1, s2,
            });
          }
        }

        return json({ success: true, orders: fetchedOrders, count: fetchedOrders.length }, 200, request);
      }
      // ──────────────────────────────────────────────────────────────

      // ─── §DIAG — worker-builder Step 5A ⑨ (إلزامي لأي Worker بيكتب) ───

      // ── ACTION: get_config ────────────────────────────────────────
      // الواجهة بتقارن النسخة دي بنسختها وبتحذّر لو مختلفين — بيكشف
      // Promote ناقص أو Worker شبح (نسخة قديمة لسه هي المنشورة).
      if (action === 'get_config') {
        return json({ ok: true, workerVersion: WORKER_VERSION }, 200, request);
      }

      // ── ACTION: diag ──────────────────────────────────────────────
      // فحص ذاتي بدون أي كتابة. ⚠️ ممنوع يرجّع قيمة أي سر — الأسماء
      // والأطوال بس (الطول بيكشف المسافة المخفية في القيمة).
      if (action === 'diag') {
        const checks = [];

        for (const k of ['WORKER_SECRET', 'CLIENT_ID', 'CLIENT_SECRET']) {
          const v = env[k];
          checks.push({ check: `env.${k}`, ok: !!v, detail: v ? `موجود (${String(v).length} حرف)` : 'ناقص' });
        }
        for (const k of ['SHOP_DOMAIN']) {
          const v = env[k];
          checks.push({ check: `env.${k}`, ok: !!v, detail: v ? String(v) : 'ناقص' });
        }

        checks.push({
          check: 'DB binding (D1)', ok: !!env.DB,
          detail: env.DB ? 'موجود' : 'ناقص — تسجيل الدخول وتاب السجل هيفشلوا',
        });
        checks.push({
          check: 'PRE_REG_KV binding (KV)', ok: !!env.PRE_REG_KV,
          detail: env.PRE_REG_KV ? 'موجود' : 'ناقص — التسجيل المسبق هيفشل (namespace: pre-register-payment-cod-KV)',
        });

        // متغيرات وbindings ملغاة لسه في الداشبورد — مش أخطاء قاتلة، لكن
        // وجودها معناه تنظيف ناقص، وبيلخبط أي جرد مستقبلي.
        for (const k of ['PREREG_WORKER_URL', 'PREREG_WORKER_SECRET', 'OSU_WORKER_URL', 'OSU_WORKER_SECRET']) {
          if (env[k] !== undefined) {
            checks.push({ check: `env.${k} — ملغى`, ok: false, detail: 'موجود في الداشبورد لكن الكود مش بيستخدمه — امسحه' });
          }
        }
        if (env.OSU_SERVICE) {
          checks.push({ check: 'Service binding OSU_SERVICE — ملغى', ok: false, detail: 'موجود لكن الكود مش بيستخدمه من v3.1.0 — امسحه من تاب Bindings' });
        }

        try {
          const token = await getAccessToken(env);
          if (!token) throw new Error('OAuth رجّع من غير access_token');
          const res = await fetch(`https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
            body: JSON.stringify({ query: '{ currentAppInstallation { accessScopes { handle } } }' }),
          });
          const data = await res.json();
          const scopes = (data?.data?.currentAppInstallation?.accessScopes || []).map(s => s.handle);
          checks.push({ check: 'Shopify OAuth + صلاحيات التطبيق', ok: true, detail: scopes.join(', ') || 'مفيش scopes' });
        } catch (e) {
          checks.push({ check: 'Shopify OAuth + صلاحيات التطبيق', ok: false, detail: e.message });
        }

        try {
          await env.DB.prepare('SELECT 1').first();
          checks.push({ check: 'D1 query', ok: true, detail: 'تم' });
        } catch (e) {
          checks.push({ check: 'D1 query', ok: false, detail: e.message });
        }

        try {
          assertPreRegKV(env);
          const probe = await env.PRE_REG_KV.list({ prefix: PREREG_PREFIX, limit: 10 });
          checks.push({
            check: 'KV read (PRE_REG_KV)', ok: true,
            detail: `تم — ${(probe.keys || []).length} مفتاح في أول صفحة${probe.list_complete ? ' (وده الإجمالي)' : ' (فيه أكتر)'}`,
          });
        } catch (e) {
          checks.push({ check: 'KV read (PRE_REG_KV)', ok: false, detail: e.message });
        }

        checks.push({ check: 'Origin', ok: true, detail: request.headers.get('Origin') || '(بدون)' });
        checks.push({ check: 'ALLOWED_ORIGINS', ok: true, detail: ALLOWED_ORIGINS.join(', ') });

        return json({ ok: checks.every(c => c.ok), workerVersion: WORKER_VERSION, checks }, 200, request);
      }

      // ── ACTION: audit_pending — ⚠️⚠️ endpoint مؤقت ────────────────
      // الغرض: جرد PRE_REG_KV قبل تنظيفها. بعد عطل 16-08 → 31-08،
      // clearPendingPreReg ما اشتغلش ولا مرة، فالمفاتيح اتراكمت — ومعاها
      // إدخالات مهاجرة من KV القديمة بتاعة ecommoda24 وإدخالات backfill
      // اتكتبت مرتين يوم 15-08. تشغيل التسجيل المسبق من غير تنظيف = خطر
      // تحصيل مكرر من المندوب.
      //
      // قراءة بحتة — صفر كتابة، صفر مسح. المسح بيتعمل يدويًا من داشبورد KV
      // بعد مطابقة الليستة دي بسجل D1.
      //
      // 🗑️ **يتشال من الكود فور ما التنظيف يخلص ويتأكد.**
      // (سابقة تحذيرية: endpoint اسمه import_logs في order-status-history-worker
      //  معلّم "مؤقت — يُحذف فور التحقق" ولسه منشور لحد النهاردة. متكررش.)
      if (action === 'audit_pending') {
        const map  = await listPendingPreReg(env);
        const now  = Date.now();
        const rows = Object.entries(map).map(([orderId, e]) => {
          const at = e?.preRegisteredAt || null;
          const ts = at ? Date.parse(at) : NaN;
          return {
            orderId,
            orderName:       e?.orderName || null,
            amount:          e?.amount ?? null,
            courier:         e?.courier || null,
            preRegisteredAt: at,
            ageDays:         isNaN(ts) ? null : Math.floor((now - ts) / 86400000),
            transactionId:   e?.transactionId || null,
            lineItemsCount:  Array.isArray(e?.lineItems) ? e.lineItems.length : 0,
          };
        }).sort((a, b) => (b.ageDays ?? 1e9) - (a.ageDays ?? 1e9));

        const totalAmount = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const noDate      = rows.filter(r => r.ageDays === null).length;

        return json({
          ok: true,
          count: rows.length,
          totalAmount: totalAmount.toFixed(2),
          withoutDate: noDate,   // إدخالات من غير preRegisteredAt = مهاجرة من الحساب القديم
          entries: rows,
        }, 200, request);
      }
      // ──────────────────────────────────────────────────────────────

      // ─── §LOG-ENDPOINTS ─────────────────────────────────────────
      // employee/type/courier بقوا يقبلوا قايمة comma-separated (اختيار متعدد)
      // + dateFrom/dateTo (تاريخ القاهرة YYYY-MM-DD) — v3.0.0.
      if (action === 'get_logs') {
        const entries = await getLogs(env.DB, {
          tool:     url.searchParams.get('tool')     || TOOL_NAME,
          employee: url.searchParams.get('employee') || null,
          type:     url.searchParams.get('type')     || null,
          courier:  url.searchParams.get('courier')  || null,
          search:   url.searchParams.get('search')   || null,
          dateFrom: url.searchParams.get('dateFrom')  || null,
          dateTo:   url.searchParams.get('dateTo')    || null,
          limit:    parseInt(url.searchParams.get('limit')  || '100'),
          offset:   parseInt(url.searchParams.get('offset') || '0'),
        });
        return json({ ok: true, entries }, 200, request);
      }

      if (action === 'get_logs_count') {
        const total = await getLogsCount(env.DB, {
          tool:     url.searchParams.get('tool')     || TOOL_NAME,
          employee: url.searchParams.get('employee') || null,
          type:     url.searchParams.get('type')     || null,
          courier:  url.searchParams.get('courier')  || null,
          search:   url.searchParams.get('search')   || null,
          dateFrom: url.searchParams.get('dateFrom')  || null,
          dateTo:   url.searchParams.get('dateTo')    || null,
        });
        return json({ ok: true, total }, 200, request);
      }

      if (action === 'get_logs_export') {
        const entries = await getLogsExport(env.DB, {
          tool:     url.searchParams.get('tool')     || TOOL_NAME,
          employee: url.searchParams.get('employee') || null,
          type:     url.searchParams.get('type')     || null,
          courier:  url.searchParams.get('courier')  || null,
          search:   url.searchParams.get('search')   || null,
          dateFrom: url.searchParams.get('dateFrom')  || null,
          dateTo:   url.searchParams.get('dateTo')    || null,
        });
        return json({ ok: true, entries }, 200, request);
      }

      // ── 🗑️ اتشالوا في v3.3.0 (31-08-2026) — متضيفهمش تاني ──────────
      // • write_external_log — بوابة كانت بتكتب أي tool/type في جدول logs
      //   المشترك بحماية WORKER_SECRET بتاع الأداة دي بس. مستهلكها الوحيد
      //   (cod-pre-register-payment-worker) بقى عنده DB binding خاص بيه
      //   وبينادي writeLog مباشرة. وكانت كمان ثغرة في القاعدة ٧
      //   (ecommoda-worker-builder): بتكتب قيم type غير مسجّلة في
      //   ecommoda-constants §7 من غير أي تحقق.
      //
      // • import_logs — endpoint ترحيل KV → D1 مؤقت، معلَّم في الكود نفسه
      //   "يتمسح بعد اكتمال الترحيل". الترحيل تم 15-08-2026 لكنه فضل منشور،
      //   ومفيهوش أي idempotency — فاتشغّل **مرتين** (18:02 و 18:03) وكتب
      //   925 صف مكرر: 750 صف cod_payment/payment بقيمة 1,839,661 ج
      //   و175 صف cod_preregister/preregister بقيمة 511,683 ج. الصفوف
      //   المكررة اتشالت من D1 في نفس التاريخ.
      // ──────────────────────────────────────────────────────────────

      return json({ error: `Unknown action: ${action}` }, 400, request);

    } catch (err) {
      return json({ error: err.message }, 500, request);
    }
  },
};