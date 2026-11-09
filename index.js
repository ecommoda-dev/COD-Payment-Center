/**
 * cod-payment-center-worker  (v3.11.0)
 * skills: worker-builder v3.7.0 · constants v3.1.0 · order-lifecycle v1.9.0 — 04-11-2026
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.11.0 — تحصيل بوسطة من ملف Cash Cycles (04-11-2026):
 *   🆕 `bostaValidate` (فحص بلا كتابة · ≤ 15 صف) و`bostaPay` (تسجيل صف واحد) — §BOSTA.
 *   🔴 شوبيفاي بيتسجّل عليه **الإجمالي** (COD + Online) == المستحق بالقرش؛ والخزنة بتقرا
 *      `extra.courierCollect` = **Net Value** (بعد رسوم بوسطة). `batchId` = `bosta-<Cash-out ID>` (جلسة واحدة
 *      لكل تحويل) و`batchExpected.orders` = كل صفوف الملف ← الجلسة «ناقصة» في الخزنة لحد ما كل الصفوف تتسجّل.
 *   🔴 صفوف «بدون تحصيل» (ملغي · استبدال بلا فرق) بتتسجّل `payment` بـ`valueAfter=0` و`noCollection=true`.
 *   ⛔ مفيش لمس لـ PRE_REG_KV (بند 14). نفس tool/type (`cod_payment` · `payment`/`refund`) — مفيش قيم جديدة في §7.
 *   `extra.source='bosta_cash_cycle'` + `cashOutId` · `trackingNumber` · `grossCollected` · `bostaFees` · `netValue`.
 *   🔴 `codPayment.min = 3.11.0` في هب الشحن — انشر الـ Worker **قبل** الصفحة. فحص: `node bosta-cash-cycle-check.mjs`.
 *
 * v3.10.1 — توثيق عقد قراءة Treasury-Ledger (04-11-2026): تعليق فوق `buildPayExtra` + قسم في CLAUDE.md.
 *   صفر تغيير سلوك ولا في أي اسم مفتاح أو شكل `extra`.
 *
 * v3.10.0 — تفصيل حسابات الانستاباي والمحفظة (فادي · مُرسل · إسلام) في السجل (03-11-2026):
 *   🆕 `extra.paymentAccounts` (حصة الصف) و`extra.sessionPaymentAccounts` (إجمالي الجلسة كما
 *      دخّله الموظف) — شكلهم `{ instapay: { "فادي": "100.00" }, wallet: { … } }`، **غير سالبين**
 *      دايمًا (الاتجاه من `type` الصف زي `paymentMethods`)، والحسابات الصفرية مابتتخزّنش.
 *      `normalizePaymentAccounts` — أسماء الحسابات نص قصير (≤ 40 حرف · ≤ 12 حساب للطريقة)
 *      ومش قايمة مقفولة، عشان إضافة حساب جديد مايحتاجش نشر Worker.
 *   ✅ إضافة بحتة: الواجهة القديمة (بلا الحقلين) = `null`، و`paymentMethods`/`pmScope` ما اتغيّروش.
 *   ⚠️ الصفوف الأقدم مالهاش التفصيل — الواجهة بتعرضها «بلا تفصيل حساب».
 *   🔴 `codPayment.min = 3.10.0` في هب الشحن — انشر الـ Worker **قبل** الصفحة، وإلا التفصيل
 *      بيتبعت ويتجاهَل **في صمت** والموظف فاكره اتسجّل.
 *
 * v3.9.0 — نوع الأوردر من أحدث دورة + إشارة طرق الدفع في السجل (03-11-2026):
 *   🔴 **تصنيف الأوردر ماكانش بيتعمل في الـ Worker أصلاً** — الواجهة كانت بتحكم
 *      من `lineItems.length > 0` ⇒ «استبدال». لكن `lineItems` = القطع اللي
 *      لسه في الأوردر، فأي **استرجاع جزئي** (رجّع ٤ وفضل ١) كان بيتسمّى
 *      استبدال (#63578 · #57971 · #61366 — مقيسين على شوبيفاي 03-11-2026).
 *   ✅ `classifyOrderKind` (§SHOPIFY) — `order-lifecycle` قاعدة 8 + 15: الاستبدال
 *      = أحدث دورة (غير ملغاة) فيها `exchangeLineItems` مش فاضية. غير كده
 *      `partial_return` (فيه قطع باقية) أو `full_return`. بيرجع في `preview`:
 *      `orderKind` · `cycleCount` · `multiCycle` — وبيتخزّن في `extra`.
 *      ⚠️ `exchangeLineItems` فاضية **مش دليل** إنه استرجاع (G-16: استبدال
 *      اتعدّل يدويًا بعد التسجيل الرسمي بيقطع الرابط) — الحقل وصف، مش حكم مالي.
 *   ⚠️ `multiCycle` علامة بس: `returnedItems` و`returnShipping` لسه بيتجمّعوا من
 *      **كل** الدورات (#61954: دورتين = رسم ١٥٠). تغيير ده تغيير مالي — مؤجّل
 *      لقرار أحمد، ومفيش رقم فلوس اتحرّك.
 *   🔴 `extra.paymentMethods` (حصة الصف) بقت **دايمًا غير سالبة** — الإشارة
 *      بتتحدد من `type` الصف وقت العرض. الموظفين بيكتبوا الاسترداد بالسالب في
 *      الأغلب (١١ من ١٣ جلسة منذ 06-09) والواجهة كانت بتقلب الإشارة فوق كده.
 *      `sessionPaymentMethods` بيفضل زي ما الموظف كتبه (أثر مراجعة).
 *   ✅ النسخة: `codPayment.min = 3.9.0` في هب الشحن (الواجهة بتعتمد على `orderKind`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.6.0 — الأوردر المسجّل مسبقًا مابيتسجّلش عليه أي تحصيل على شوبيفاي (26-09-2026):
 *   🔴 `pay` كان بيسجّل `totalOutstanding` كله على شوبيفاي لأي أوردر مسجّل
 *      مسبقًا عليه متبقي. المتبقي ده طلع **فرق استبدال S2** اتعمل بعد التسجيل
 *      المسبق وشحنته لسه ما خرجتش — فاتعلّم مدفوع من غير ما يتقبض، ولما S2
 *      اتسلّمت الأداة رفضت تحصّله. ١٤ أوردر (٤٬٨٠٠ ج) من 31-08 لـ 26-09.
 *   ✅ `classifyPreReg` (§PREREG) — دالة واحدة لـ `preview` و`pay`:
 *      · صفر نداء `createTransaction` في مسار التسجيل المسبق.
 *      · المتبقي مع S2/return → بيفضل على شوبيفاي (`s2Due`) لجلسة S2.
 *      · المتبقي من غير S2 ولا return → ⛔ `blocked` والعملية كلها بتقف
 *        (قرار أحمد 26-09-2026) — قبل أي كتابة.
 *      · حارس اتفاق: `amount` من الواجهة لازم == مبلغ التسجيل المسبق.
 *   ✅ `valueAfter` في السجل = مبلغ التسجيل المسبق (اللي المندوب سلّمه)، مش
 *      صفر ولا المتبقي — و`extra.shopifyCaptured = 0` صريحة.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.5.1 — الحارس الديناميكي لقيم اللوج (الطبقة ٥ · worker-builder Step 7-ج)
 * (22-09-2026):
 *   🔴 check-log-values.mjs اتستبدل بالنسخة المصلّحة (بتمسك object shorthand
 *      `{ tool, type }` جنب `type:` الصريح — النسخة القديمة كانت بتعدّي عليه
 *      في صمت). الأداة دي كانت نضيفة أصلًا — كل نداء writeLog فيها بيكتب
 *      `type:` صريح، فالتشغيل بعد الاستبدال طلع exit 0 من غير أي قيمة ناقصة.
 *   🆕 §LOG-REG — `LOG_REGISTRY` + `isRegisteredLogValue` + `noteUnregisteredLogValues`
 *      جوّه writeLog. قيمة (tool,type) مش مسجّلة **بتتكتب برضه** مع
 *      `extra._unregistered = true`، ومعاها UPSERT صامت في `log_value_alerts`
 *      (جدول مشترك على مستوى الستاك، مش اتعمل هنا). مفيش رفض كتابة أبدًا —
 *      الحارس بيراقب، مايحكمش. `safeWriteLog` مغطّاة تلقائيًا لأنها بتنده
 *      `writeLog`، ومفيش أنكور تاني (`writeLogsBatch` وغيرها) في الملف ده.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * v3.5.0 — عقد النداءات الخارجية اتطبّق بالكامل (06-09-2026):
 *   مراجعة كاملة مقابل ecommoda-worker-builder v2.1.0. الأداة كانت مطبّقة
 *   بنود §PREREG (5A ⑥) و§DIAG (5A ⑨) بس — الباقي كان ناقص.
 *
 *   🔴 §SHOPIFY::shopifyGQL — اتضافت ودخلت على **كل** نداء GraphQL في الملف
 *      (7 مواضع كانت `await res.json()` خام بلا أي فحص). بترمي على: فشل شبكة ·
 *      HTTP status · رد مش JSON · `data.errors` · `data` فاضية، ومعاها backoff
 *      على THROTTLED. (Step 5A ①)
 *      **العطل اللي البند ده بيقفله — أخطر سطر كان في الملف:**
 *      `getOrderOutstanding` كانت `parseFloat(undefined || '0')` = **صفر** عند
 *      أي فشل. والصفر في مسار الأوردر المسجّل مسبقًا معناه "مفيش مستحق إضافي"،
 *      فالكود كان بيتخطّى `createTransaction` تمامًا، **يمسح مفتاح PRE_REG_KV**
 *      (خطوة لا رجعة فيها)، يكتب صف D1 بـ `valueAfter: 0`، ويرجّع
 *      `success: true`. يعني THROTTLE واحدة من شوبيفاي = فلوس اتقبضت من
 *      المندوب، الأوردر فاضل غير محصّل على شوبيفاي، والتسجيل المسبق ضاع —
 *      من غير أي رسالة. الدالة دلوقتي **بترمي** ومابترجّعش صفر أبدًا.
 *
 *   🔴 §SHARED::safeWriteLog + `logged`/`logError` في رد pay/refund. الكتابة
 *      في D1 بتحصل **بعد** ما الفلوس اتقبضت على شوبيفاي، و`await writeLog`
 *      المكشوف كان بيطلّع الاستثناء للـ catch الخارجي = **500**. فالموظف كان
 *      هيشوف "فشل" على تحصيل اتنفّذ فعلًا ويعيده. (Step 5A ⑦)
 *
 *   🔴 get_logs_export بقى يرجّع `{ entries, cap, total, truncated }`. السقف
 *      (LOG_EXPORT_MAX) بقى ثابت مسمّى وبيترجع للواجهة — من غيره التصدير
 *      المقصوص بيعدّي بعلامة صح خضرا. (html-builder Standards #30)
 *
 *   🆕 نتيجة العملية **تلات حالات** — `status` ∈ success|warning|error في الرد،
 *      و`extra.result` + `extra.actions` في D1. `warning` = الفعل الأساسي تم
 *      بس فيه حاجة ما اتأكدتش (مسح PRE_REG_KV فشل مثلاً) — **ممنوع تتحسب
 *      نجاح**. الصفوف الأقدم من v3.5.0 مالهاش `result` والواجهة بتعرض "—"
 *      عليها مش "✓". (Step 5A ④ + ⑤)
 *
 *   🆕 `assertEnv()` — متغير ناقص بيوقف العملية **برسالة باسمه** بدل
 *      `"error code: 1003" is not valid JSON`. (Step 5A ⑧)
 *   🔄 `diag.checks[]` المفتاح بقى `label` بدل `check` — المُطبِّع الرسمي بيقرا
 *      `c.label || c.name`، فالقديم كان بيعرض `undefined` في أي مستهلك موحّد.
 *   🔄 getCourierOrders: سقف 40 صفحة بدل حلقة مفتوحة، والوصول للسقف بيرجّع
 *      `truncated: true` + `warning` بدل ما يتعرض كأنه نتيجة كاملة.
 *   🔄 createTransaction: رد مش JSON بقى رسالة واضحة مش استثناء غامض.
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
const WORKER_VERSION = 'v3.11.1';

// 🔴 توقيت القاهرة بـ`Intl` على Africa/Cairo — مش إزاحة ثابتة (v3.8.0).
// كانت `CAIRO_OFFSET_HOURS = 3` ثابتة، ومصر رجعت UTC+2 يوم 29-10-2026 فكل حدود
// فلتر التاريخ و"اليوم" كانت هتغلط بساعة بلا أي شكوى (ecommoda-constants §13).
// مستخدم في: فلتر تاريخ/وقت تاب السجل + "اليوم" في §TODAY-IMPORT.
let _cairoFmt = null;
function cairoOffsetMsAt(ms) {
  if (!_cairoFmt) {
    _cairoFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  const sec = Math.floor(ms / 1000) * 1000;
  const o = {};
  for (const x of _cairoFmt.formatToParts(new Date(sec))) if (x.type !== 'literal') o[x.type] = parseInt(x.value, 10);
  return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - sec;
}
// تاريخ/وقت محلي بتوقيت القاهرة → لحظة UTC (بالمللي ثانية)
function cairoLocalToUtcMs(y, mo, d, h, mi, s, ms) {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s, ms);
  let t = guess - cairoOffsetMsAt(guess);
  t = guess - cairoOffsetMsAt(t);
  return t;
}
// فترات الصيفي (UTC+3) بين 2023 و2040 — بتتحسب مرة وتتخزّن. بتتحط في SQL عشان
// وقت اليوم بتوقيت القاهرة يتحسب صح لكل صف حسب تاريخه (مش بإزاحة واحدة للكل).
let _dstSpans = null;
function cairoDstSpans() {
  if (_dstSpans) return _dstSpans;
  const H = 3600 * 1000, DAY = 24 * H;
  const from = Date.UTC(2023, 0, 1), to = Date.UTC(2040, 0, 1);
  const spans = [];
  let prev = cairoOffsetMsAt(from), start = prev === 3 * H ? from : null, t = from;
  while (t < to) {
    const nt = Math.min(t + 7 * DAY, to), cur = cairoOffsetMsAt(nt);
    if (cur !== prev) {
      let lo = t, hi = nt;                       // أول ثانية بالإزاحة الجديدة
      while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); (cairoOffsetMsAt(mid) === prev ? (lo = mid) : (hi = mid)); }
      if (cur === 3 * H) start = hi; else if (start !== null) { spans.push([start, hi]); start = null; }
      prev = cur;
    }
    t = nt;
  }
  if (start !== null) spans.push([start, to]);
  _dstSpans = spans.map(([a, b]) => [new Date(a).toISOString(), new Date(b).toISOString()]);
  return _dstSpans;
}
function cairoOffsetCaseSQL() {
  const sp = cairoDstSpans();
  if (!sp.length) return '2';
  return `(CASE WHEN ${sp.map(([a, b]) => `(timestamp >= '${a}' AND timestamp < '${b}')`).join(' OR ')} THEN 3 ELSE 2 END)`;
}

// سقف تصدير السجل — بيترجع للواجهة كـ `cap` جنب `total` و`truncated` عشان
// التصدير المقصوص يبان كتحذير بدل علامة صح خضرا (html-builder Standards #30).
const LOG_EXPORT_MAX = 2000;

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

// ════════════════════════════════════════════════════════════
// §LOG-REG — الحارس الديناميكي لقيم اللوج (الطبقة ٥ · worker-builder Step 7-ج)
// ════════════════════════════════════════════════════════════
// قطعة الأداة دي بس من log-values.json اللي جنبها — بتتحدّث معاه في نفس
// الـ commit. ممنوع شحن سجل الـ32 أداة هنا.
const LOG_REGISTRY = {
  cod_payment: new Set(['login', 'logout', 'payment', 'refund']),
};

const isRegisteredLogValue = (tool, type) => !!LOG_REGISTRY[tool]?.has(type);

// UPSERT على (source_tool, tool, type) — صف واحد لكل قيمة، hits بيعدّ.
// الحدث الكامل مش بيضيع: الصف الأصلي موجود في logs وعليه _unregistered،
// والجدول ده فهرس مش سجل تاني — عشان كده dedupe مش صف لكل حدث.
const LOG_ALERT_SQL = `
  INSERT INTO log_value_alerts
    (source_tool, tool, type, first_seen, last_seen, hits,
     worker_version, sample_order_name, sample_employee, sample_notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(source_tool, tool, type) DO UPDATE SET
    last_seen         = excluded.last_seen,
    hits              = log_value_alerts.hits + excluded.hits,
    worker_version    = excluded.worker_version,
    sample_order_name = excluded.sample_order_name,
    sample_employee   = excluded.sample_employee,
    sample_notes      = excluded.sample_notes,
    status            = CASE WHEN log_value_alerts.status = 'ignored'
                             THEN 'ignored' ELSE 'open' END
`;

// فشل التنبيه ممنوع يأثر على أي حاجة — try/catch صامت. بتجمّع التكرار جوّه
// نفس الدفعة في صف واحد (hits) قبل ما تكتب.
async function noteUnregisteredLogValues(db, entries) {
  const byPair = new Map();
  for (const e of entries) {
    const key = `${e.tool}\u0000${e.type}`;
    const acc = byPair.get(key);
    if (acc) { acc.hits++; continue; }
    byPair.set(key, { entry: e, hits: 1 });
  }
  const now = new Date().toISOString();
  for (const { entry, hits } of byPair.values()) {
    try {
      await db.prepare(LOG_ALERT_SQL).bind(
        TOOL_NAME, entry.tool ?? '(بدون tool)', entry.type ?? '(بدون type)',
        now, now, hits, WORKER_VERSION ?? null,
        entry.orderName ?? null, entry.employee ?? null,
        entry.notes ? String(entry.notes).slice(0, 200) : null,
      ).run();
    } catch (e) { /* متعمّد: التنبيه فهرس، وفشله أهون من تعطيل الأداة */ }
  }
}

async function writeLog(db, entry) {
  const unregistered = !isRegisteredLogValue(entry.tool, entry.type);
  const extra = unregistered
    ? { ...(entry.extra || {}), _unregistered: true }
    : entry.extra;

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
    extra ? JSON.stringify(extra) : null
  ).run();

  if (unregistered) await noteUnregisteredLogValues(db, [entry]);   // بعد الكتابة، مش قبلها
}

// ─── §SHARED::safeWriteLog — worker-builder Step 5A ⑦ (v3.5.0) ───
// 🔴 العملية المالية بتحصل على شوبيفاي **قبل** الكتابة في D1. `await writeLog`
//    مكشوف كان معناه إن فشل D1 يطلع للـ catch الخارجي ويرجّع 500 — فالموظف
//    يشوف "فشل" على تحصيل **اتنفّذ فعلًا**، ويعيده. الفلوس اتقبضت مرتين.
//    القاعدة: العملية حصلت — بس مفيش سجل. يترجع `logged:false` والواجهة تحذّر.
//    ⛔ وممنوع `.catch(() => {})` — ده بيخفي الفشل بدل ما يبلّغ عنه.
async function safeWriteLog(db, entry) {
  try { await writeLog(db, entry); return { logged: true, logError: null }; }
  catch (e) { console.error('writeLog failed:', e.message); return { logged: false, logError: e.message }; }
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
  const [y, m, d] = String(dateStr).split('-').map(n => parseInt(n, 10));
  const start = cairoLocalToUtcMs(y, m, d, 0, 0, 0, 0);
  const end   = cairoLocalToUtcMs(y, m, d, 23, 59, 59, 999);
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

// ─── v3.8.0 — فلاتر السجل الجديدة (طلب أحمد 02-11-2026، بنود html-builder v8.6.0) ───
// 🔴 كلها server-side عن قصد: الجدول جلسات والصفحة ١٠٠ عملية بس، فأي فلتر في المتصفح
//    كان هيعدّ الصفحة، والصفحة التانية تيجي بلا فلتر، والتصدير غير مفلتر.
const SESSION_KEY_SQL = "COALESCE(NULLIF(json_extract(extra,'$.batchId'),''), type || '-row-' || id)";

// توكنز رقم الأوردر: أرقام بس، OR بينهم (المسافة/الفاصلة = أوردر تاني)
function parseOrderTokens(v) {
  return [...new Set(String(v || '').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).split(/\D+/).filter(Boolean))].slice(0, 30);
}
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function numSpec(raw, field) {
  // raw: { from, to, list } — القايمة والنطاق متبادلين (القايمة تكسب)
  const list = parseListParam(raw.list).map(Number).filter(n => isFinite(n)).slice(0, 100);
  if (list.length) return { list };
  const f = raw.from !== null && raw.from !== '' && isFinite(Number(raw.from)) ? Number(raw.from) : null;
  const t = raw.to   !== null && raw.to   !== '' && isFinite(Number(raw.to))   ? Number(raw.to)   : null;
  return (f !== null || t !== null) ? { from: f, to: t } : null;
}
// مجاميع الجلسة (نفس تعريف الواجهة: عدد = صفوف الجلسة · تحصيل = مجموع غير الاسترداد · استرداد = مجموع الاسترداد)
function sessionAggSQL(tool) {
  return `SELECT sk, COUNT(*) AS cnt,
            ROUND(SUM(CASE WHEN type = 'refund' THEN 0 ELSE CAST(value_after AS REAL) END), 2) AS collect,
            ROUND(SUM(CASE WHEN type = 'refund' THEN CAST(value_after AS REAL) ELSE 0 END), 2) AS refund
          FROM (SELECT ${SESSION_KEY_SQL} AS sk, type, value_after FROM logs
                WHERE type NOT IN ('login','logout','extra_shipping')${tool ? ' AND tool = ?' : ''})
          GROUP BY sk`;
}
const NUM_COL = { count: 'cnt', collect: 'collect', refund: 'refund' };

function buildLogFilterSQL({ tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null, orders = null, timeFrom = null, timeTo = null, num = null } = {}) {
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

  // رقم الأوردر — توكنز (OR) على order_name فقط
  const toks = parseOrderTokens(orders);
  if (toks.length) {
    sql += ` AND (${toks.map(() => 'order_name LIKE ?').join(' OR ')})`;
    b.push(...toks.map(t => `%${t}%`));
  }

  // وقت اليوم بتوقيت القاهرة (HH:MM) — مستقل عن التاريخ، والاتنين AND
  const tf = HHMM_RE.test(timeFrom || '') ? timeFrom : null, tt = HHMM_RE.test(timeTo || '') ? timeTo : null;
  if (tf || tt) {
    const tod = `strftime('%H:%M', datetime(substr(timestamp, 1, 19), '+' || ${cairoOffsetCaseSQL()} || ' hours'))`;
    if (tf) { sql += ` AND ${tod} >= ?`; b.push(tf); }
    if (tt) { sql += ` AND ${tod} <= ?`; b.push(tt); }
  }

  // مجاميع الجلسة (عدد/تحصيل/استرداد): الجلسة كلها بتتحسب مش الصفوف المفلترة بس
  if (num) {
    const conds = [], nb = [];
    for (const k of Object.keys(NUM_COL)) {
      const sp = num[k]; if (!sp) continue;
      const col = NUM_COL[k];
      if (sp.list) { conds.push(`${col} IN (${sp.list.map(() => '?').join(',')})`); nb.push(...sp.list); }
      else {
        if (sp.from !== null && sp.from !== undefined) { conds.push(`${col} >= ?`); nb.push(sp.from); }
        if (sp.to   !== null && sp.to   !== undefined) { conds.push(`${col} <= ?`); nb.push(sp.to); }
      }
    }
    if (conds.length) {
      sql += ` AND ${SESSION_KEY_SQL} IN (SELECT sk FROM (${sessionAggSQL(tool)}) WHERE ${conds.join(' AND ')})`;
      if (tool) b.push(tool);
      b.push(...nb);
    }
  }

  return { sql, binds: b };
}

async function getLogs(db, {
  tool = null, employee = null, type = null, courier = null, search = null,
  dateFrom = null, dateTo = null, limit = 100, offset = 0, orders = null, timeFrom = null, timeTo = null, num = null,
} = {}) {
  const { sql: whereSql, binds } = buildLogFilterSQL({ tool, employee, type, courier, search, dateFrom, dateTo, orders, timeFrom, timeTo, num });
  const sql = `SELECT * ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  const b = binds.slice();
  b.push(Math.min(limit, 100), offset);
  return (await db.prepare(sql).bind(...b).all()).results;
}

async function getLogsCount(db, {
  tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null, orders = null, timeFrom = null, timeTo = null, num = null,
} = {}) {
  const { sql: whereSql, binds } = buildLogFilterSQL({ tool, employee, type, courier, search, dateFrom, dateTo, orders, timeFrom, timeTo, num });
  const row = await db.prepare(`SELECT COUNT(*) as total ${whereSql}`).bind(...binds).first();
  return row?.total ?? 0;
}

// 🔴 بيرجّع `{ entries, cap, total, truncated }` مش الصفوف بس — html-builder
//    Standards #30. من غير التلاتة دول الواجهة بتقول "تم التصدير ✓" على ملف
//    مقصوص، والموظف فاكره كامل. الحقيقة بتيجي من هنا — ممنوع الواجهة تكتب
//    السقف عندها (يتغيّر هنا ويفضل قديم هناك).
async function getLogsExport(db, {
  tool = null, employee = null, type = null, courier = null, search = null, dateFrom = null, dateTo = null, orders = null, timeFrom = null, timeTo = null, num = null,
} = {}) {
  const args = { tool, employee, type, courier, search, dateFrom, dateTo, orders, timeFrom, timeTo, num };
  const { sql: whereSql, binds } = buildLogFilterSQL(args);
  const sql = `SELECT * ${whereSql} ORDER BY timestamp DESC LIMIT ${LOG_EXPORT_MAX}`;
  const entries = (await db.prepare(sql).bind(...binds).all()).results || [];
  const total   = await getLogsCount(db, args);
  return { entries, cap: LOG_EXPORT_MAX, total, truncated: entries.length >= LOG_EXPORT_MAX };
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
  const d = new Date(Date.now() + cairoOffsetMsAt(Date.now()));
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
// 🆕 v3.5.0 — `result` و`actions` في `extra` (worker-builder Step 5A ④ + ⑤).
//    `result` ∈ 'success' | 'warning' | 'error' — الصفوف الأقدم من v3.5.0
//    مالهاش الحقل ده، والواجهة بتعرض "—" مش "✓" عليها: إحنا فعليًا مش عارفين
//    إن الفعل اتأكد وقتها. و`actions` بيتملى **أول بأول** من بره مش بيترجع من
//    دالة في الآخر — عشان استثناء في النص مايخليش السجل يقول "ما حصلش حاجة".
// ⚠️ عقد قراءة: Treasury-Ledger بتقرا batchId · courier · courierCollect · extraShipping[] ·
//    extraShippingTotal · batchExpected (+ result · preRegistered · hasReturn) من الصفوف دي.
//    تغيير اسم أي مفتاح = جلسات فاضية/ناقصة في الخزنة بلا أي خطأ. غيّر في الاتنين معًا.
function buildPayExtra({ batchId, sessionMeta, orderMeta, courier, isRefund, refundAmount, result, actions }) {
  const sm    = sessionMeta || {};
  const om    = orderMeta   || {};
  const split = normalizePaymentSplit(om.paymentSplit);
  return {
    result:             result || null,
    actions:            Array.isArray(actions) ? actions : [],
    batchId:            batchId || null,
    courier:            courier || sm.courier || null,
    paymentMethods:        split || sm.paymentMethods || null,
    pmScope:               split ? 'order' : 'session',
    sessionPaymentMethods: sm.paymentMethods || null,
    // 🆕 v3.10.0 — تفصيل حسابات الانستاباي/المحفظة (حصة الصف + إجمالي الجلسة)
    paymentAccounts:        normalizePaymentAccounts(om.paymentAccounts),
    sessionPaymentAccounts: normalizePaymentAccounts(sm.paymentAccounts),
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
    // 🆕 v3.9.0 — وصف الأوردر وقت العملية (مابيتحسبش من الصف بعدين). قيمة مش في
    //    القايمة المقفولة = null، والصفوف الأقدم مالهاش الحقل (الواجهة بتعرض تسمية محايدة).
    orderKind:          ORDER_KINDS.has(om.orderKind) ? om.orderKind : null,
    multiCycle:         om.multiCycle === true,
  };
}

// ─── §PAY::normalizePaymentSplit (v3.9.0) ───
// 🔴 حصة الصف من طرق الدفع بتتخزّن **غير سالبة دايمًا** — الإشارة (استرداد = سالب)
//    بتتحدد من `type` الصف وقت العرض والتصدير. قبل كده الإشارة كانت بتتخزّن زي ما
//    الموظف كتبها: الاسترداد بالسالب (١١ من ١٣ جلسة) أو بالموجب، والواجهة كانت
//    بتقلب إشارة صفوف الاسترداد فوق كده ← 10,800 بدل −10,800 في السجل والإكسيل.
//    `Math.abs` هنا آمن: مفيش حصة سالبة بمعنى مختلف (الاتجاه في `type`).
function normalizePaymentSplit(split) {
  if (!split || typeof split !== 'object') return null;
  const n = v => Math.abs(parseFloat(v) || 0).toFixed(2);
  return { cash: n(split.cash), instapay: n(split.instapay), wallet: n(split.wallet) };
}

// ─── §PAY::normalizePaymentAccounts (v3.10.0) ───
// `{ instapay: { "فادي": "100" }, wallet: { … } }` ← نفس الشكل بقيم موجبة بمليمين، من غير الحسابات الصفرية.
// ⛔ قيمة بره الشكل ده (مش object · طريقة غير instapay/wallet · اسم فاضي أو طويل) بتتجاهَل في صمت —
//    الحقل ده تفصيل مراجعة، والمبلغ الأساسي في `paymentMethods` ما بيتأثرش.
const PAY_ACCOUNT_METHODS = ['instapay', 'wallet'];
function normalizePaymentAccounts(acc) {
  if (!acc || typeof acc !== 'object') return null;
  const out = {};
  for (const m of PAY_ACCOUNT_METHODS) {
    const src = acc[m];
    if (!src || typeof src !== 'object' || Array.isArray(src)) continue;
    const one = {};
    for (const [name, v] of Object.entries(src).slice(0, 12)) {
      const nm = String(name).trim();
      const n = Math.abs(parseFloat(v) || 0);
      if (!nm || nm.length > 40 || !(n > 0)) continue;
      one[nm] = n.toFixed(2);
    }
    if (Object.keys(one).length) out[m] = one;
  }
  return Object.keys(out).length ? out : null;
}

// ══════════════════════════════════════════════════════
// §SHOPIFY
// ══════════════════════════════════════════════════════

// ─── §SHOPIFY::sleep ───
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── §SHOPIFY::assertEnv ───
// worker-builder Step 5A ⑧ — متغير ناقص يوقف العملية **برسالة باسمه** بدل ما
// يتحوّل لفشل غامض (`SHOP_DOMAIN` الناقص بيدّي: "error code: 1003" is not valid JSON).
function assertEnv(env, keys) {
  const missing = keys.filter(k => !env[k]);
  if (missing.length) throw new Error(`متغيرات ناقصة في إعدادات الـ Worker: ${missing.join(' · ')} — راجع Settings → Variables and Secrets ثم Promote`);
}

// ─── §SHOPIFY::shopifyGQL ───
// 🔴 worker-builder Step 5A ① — النسخة الكاملة. بترمي على: فشل شبكة · HTTP
//    status · رد مش JSON · data.errors · data فاضية. + إعادة محاولة على THROTTLED.
//
// 📛 ليه ده اتضاف في v3.5.0 — الأداة كانت بتنادي شوبيفاي بـ 7 نداءات خام
//    (`await res.json()` من غير أي فحص). النتيجة على كل واحد منهم كانت
//    **رسالة كاذبة مش خطأ**:
//      • getOrderOutstanding  → `parseFloat(undefined || '0')` = **صفر**
//      • getOrderDataById     → null = "الأوردر مش موجود"
//      • getCourierValues     → قايمة مناديب فاضية
//      • getCourierOrdersToday→ الدفعة كلها بتتاكل في صمت
//    الأخطر كان الأول: صفر في مسار الأوردر المسجّل مسبقًا معناه "مفيش مستحق
//    إضافي" — فالكود كان **بيتخطّى التحصيل**، **يمسح مفتاح PRE_REG_KV**،
//    ويرجّع `success: true`. يعني THROTTLE واحدة من شوبيفاي = فلوس اتقبضت من
//    المندوب والأوردر فاضل غير محصّل، ومفيش أي أثر. نفس عيلة عطل §PREREG
//    (v3.2.0) بالظبط — بس في المسار المالي المباشر.
const GQL_RETRY_DELAYS_MS = [400, 900, 1800];

async function shopifyGQL(env, token, query, variables = {}, opName = 'shopify') {
  assertEnv(env, ['SHOP_DOMAIN']);
  const url = `https://${env.SHOP_DOMAIN}/admin/api/2026-01/graphql.json`.replace(/\/$/, '');

  for (let attempt = 0; ; attempt++) {
    let resp;
    try {
      resp = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
        body:    JSON.stringify({ query, variables }),
      });
    } catch (e) {
      throw new Error(`${opName}: فشل الاتصال بشوبيفاي — ${e.message}`);
    }

    const raw = await resp.text();
    if (!resp.ok) {
      // 429/5xx قابلة لإعادة المحاولة؛ 401/403 لأ (سر أو صلاحية غلط)
      if ((resp.status === 429 || resp.status >= 500) && attempt < GQL_RETRY_DELAYS_MS.length) {
        await sleep(GQL_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(`${opName}: شوبيفاي ردّت HTTP ${resp.status} — ${raw.slice(0, 300)}`);
    }

    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error(`${opName}: رد شوبيفاي مش JSON — ${raw.slice(0, 300)}`); }

    if (Array.isArray(data.errors) && data.errors.length) {
      const throttled = data.errors.some(e => e?.extensions?.code === 'THROTTLED');
      if (throttled && attempt < GQL_RETRY_DELAYS_MS.length) {
        await sleep(GQL_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new Error(`${opName}: ${data.errors.map(e => e.message).join(' | ')}`);
    }

    // `data` فاضية مع userErrors: [] = العطل اللي بيعدّي كأنه نجاح
    if (!data.data) throw new Error(`${opName}: شوبيفاي ردّت من غير data`);

    return data;
  }
}

async function getAccessToken(env) {
  assertEnv(env, ['SHOP_DOMAIN', 'CLIENT_ID', 'CLIENT_SECRET']);
  const res = await fetch(`https://${env.SHOP_DOMAIN}/admin/oauth/access_token`.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     env.CLIENT_ID,
      client_secret: env.CLIENT_SECRET,
    }),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`OAuth: شوبيفاي ردّت HTTP ${res.status} — ${raw.slice(0, 200)}`);
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`OAuth: رد شوبيفاي مش JSON — ${raw.slice(0, 200)}`); }
  return data.access_token || null;
}

// ─── §SHOPIFY::classifyOrderKind (v3.9.0) ───
// 🔴 النوع بيتقرا من **أحدث دورة** مش من `.some()` على كل الدورات (قاعدة 15 ②)،
//    ومن `exchangeLineItems` مش من `lineItems` (قاعدة 8).
//      normal          — مفيش دورة نشطة
//      exchange        — أحدث دورة فيها قطع استبدال
//      partial_return  — أحدث دورة استرجاع وفيه قطعة لسه في الأوردر
//      full_return     — أحدث دورة استرجاع ومفيش ولا قطعة باقية
// الدورات الملغاة/المرفوضة (CANCELED · DECLINED) بتتخطّى. الترتيب بـ`createdAt`
// **مش** بترتيب المصفوفة. `multiCycle` علامة بس — مابتغيّرش ولا رقم فلوس.
// ⚠️ `exchangeLineItems` فاضية = «مفيش قطع استبدال مسجّلة»، مش «ده استرجاع»
//    (G-16): الوصف تقريبي في حالة الاستبدال المعدّل يدويًا، والفلوس مابتتأثرش.
const ORDER_KINDS = new Set(['normal', 'exchange', 'partial_return', 'full_return']);
function classifyOrderKind(returnsNodes, remainingQty) {
  const cycles = (returnsNodes || [])
    .filter(r => r && r.status !== 'CANCELED' && r.status !== 'DECLINED')
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  if (!cycles.length) return { orderKind: 'normal', cycleCount: 0, multiCycle: false };
  const current    = cycles[cycles.length - 1];
  const isExchange = (current.exchangeLineItems?.nodes || []).length > 0;
  const orderKind  = isExchange ? 'exchange' : ((Number(remainingQty) || 0) > 0 ? 'partial_return' : 'full_return');
  return { orderKind, cycleCount: cycles.length, multiCycle: cycles.length > 1 };
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
            createdAt
            exchangeLineItems(first: 10) { nodes { id } }
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

  const data  = await shopifyGQL(env, token, query, { id: `gid://shopify/Order/${numericId}` }, 'getOrderById');
  // ⚠️ هنا `null` معناها الأوردر مش موجود فعلاً — أي فشل استعلام بيترمي من
  //    shopifyGQL قبل ما يوصل هنا. الخلط بين الاتنين هو العطل نفسه (Step 5A ⑥).
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
  // 🆕 v3.9.0 — نوع الأوردر من **أحدث** دورة (order-lifecycle قاعدة 8 + 15).
  //    `remainingQty` من **كل** سطور الأوردر (مش المصفّاة بـ sku) — فرق الاسترجاع
  //    الجزئي عن الكلي هو «فيه قطعة لسه في الأوردر ولا لأ».
  const remainingQty = (order.lineItems?.nodes || []).reduce((n, li) => n + (Number(li.currentQuantity) || 0), 0);
  const kindInfo     = classifyOrderKind(returnsNodes, remainingQty);

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
    orderKind: kindInfo.orderKind, cycleCount: kindInfo.cycleCount, multiCycle: kindInfo.multiCycle,
  };
}

// 🔴 الدالة دي **بترمي** ومابترجّعش صفر عند الفشل. كانت أخطر سطر في الملف:
//    `parseFloat(undefined || '0')` = 0، والصفر في مسار الأوردر المسجّل مسبقًا
//    كان معناه "مفيش مستحق إضافي". تفاصيل كاملة في تعليق §SHOPIFY::shopifyGQL فوق.
// 🆕 v3.6.0 — بقت بترجّع كمان `s2` و`hasReturn`: `classifyPreReg` محتاجاهم عشان
//    تفرّق «متبقي بتاع شحنة S2» عن «متبقي مالوش تفسير» (راجع التعليق تحتها).
async function getPreRegPayState(token, env, numericId) {
  const query = `
    query getPreRegPayState($id: ID!) {
      order(id: $id) {
        totalOutstandingSet { shopMoney { amount } }
        s2Meta: metafield(namespace: "custom", key: "status_2_r_e") { value }
        returns(first: 1) { nodes { id } }
      }
    }
  `;
  const data  = await shopifyGQL(env, token, query, { id: `gid://shopify/Order/${numericId}` }, 'getPreRegPayState');
  const order = data?.data?.order;
  if (!order) throw new Error(`الأوردر ${numericId} مش موجود على شوبيفاي — التحصيل اتوقف`);
  const amt = order.totalOutstandingSet?.shopMoney?.amount;
  if (amt == null) throw new Error(`شوبيفاي ما رجّعتش المستحق للأوردر ${numericId} — التحصيل اتوقف`);
  return {
    outstanding: parseFloat(amt),
    s2:          order.s2Meta?.value || null,
    hasReturn:   (order.returns?.nodes || []).length > 0,
  };
}

// ─── §PREREG::classifyPreReg (v3.6.0) ───
// 🔴 القاعدة: الأوردر المسجّل مسبقًا **مابيتسجّلش عليه أي تحصيل على شوبيفاي**
//    في جلسة المندوب — فلوسه اتسجّلت خلاص في `cod-pre-register-payment`.
//    المندوب بيسلّم **مبلغ التسجيل المسبق** (`pending.amount`) وده اللي بيتكتب.
//
// **العطل اللي البند ده بيقفله (اتكشف 26-09-2026 على #55851):** الكود القديم
//    كان بيسجّل `totalOutstanding` كله على شوبيفاي لو أكبر من صفر، على افتراض
//    إن أي متبقي المندوب جابه **في الجلسة دي**. لكن خدمة العملاء بتعمل
//    استبدال بعد التسجيل المسبق، فالمتبقي بيبقى **فرق الاستبدال (S2)** —
//    وشحنة S2 لسه ما خرجتش. النتيجة: فلوس S2 اتعلّمت مدفوعة على شوبيفاي من
//    غير ما حد يقبضها، ولما S2 اتسلّمت الأداة رفضت تحصّلها («مدفوع بالكامل»).
//    ١٤ أوردر من 31-08 لـ 26-09 (٤٬٨٠٠ ج). وكمان الـ preview كان بيعرض مبلغ
//    والـ pay بيسجّل مبلغ تاني، ومفيش أي نقطة بتقارن الاتنين.
//
// الحالات:
//   • متبقي ≤ 0                        → عادي. مفيش حاجة على شوبيفاي.
//   • متبقي > 0 + فيه S2 أو return     → المتبقي **بتاع S2** ويفضل على شوبيفاي
//                                         لحد ما شحنة S2 تتحصّل بالمسار العادي.
//   • متبقي > 0 من غير S2 ولا return   → ⛔ **حالة مش متوقعة** (قرار أحمد
//                                         26-09-2026): الأوردر اتعدّل بعد
//                                         التسجيل المسبق. **العملية كلها بتقف**
//                                         لحد ما حد يراجعه — مفيش تخمين.
function classifyPreReg(pending, state) {
  const preRegAmount = parseFloat(pending.amount);
  // ⚠️ مبلغ تالف في KV = `NaN`، وأي مقارنة مع `NaN` بترجّع false — فحارس
  //    الاتفاق في `pay` كان هيعدّيه ويكتب `NaN` في السجل. وقف صريح بدل كده.
  if (!Number.isFinite(preRegAmount) || preRegAmount <= 0) {
    return { preRegAmount: 0, s2Due: null, block: `⛔ مبلغ التسجيل المسبق في PRE_REG_KV تالف («${pending.amount}») — العملية اتوقفت. راجع التسجيل المسبق.` };
  }
  const hasS2 = !!state.s2 || !!state.hasReturn;
  if (state.outstanding > 0.005 && !hasS2) {
    return {
      preRegAmount, s2Due: null,
      block: `⛔ أوردر مسجّل مسبقًا (${preRegAmount.toFixed(2)} ج) وعليه متبقي ${state.outstanding.toFixed(2)} ج على شوبيفاي من غير أي استبدال/مرتجع — الأوردر اتعدّل بعد التسجيل المسبق. العملية اتوقفت: راجع الأوردر قبل التحصيل.`,
    };
  }
  return {
    preRegAmount,
    s2Due: state.outstanding > 0.005 ? state.outstanding : null,
    block: null,
  };
}

async function getOrderIdByName(env, orderNumber) {
  const token = await getAccessToken(env);
  if (!token) throw new Error('Failed to get Shopify access token');

  const query = `
    query getOrderByNumber($query: String!) {
      orders(first: 1, query: $query) { nodes { id name } }
    }
  `;
  const data   = await shopifyGQL(env, token, query, { query: `name:#${orderNumber}` }, 'getOrderByNumber');
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
  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch { /* رد مش JSON — بيتعامل معاه كفشل برسالة واضحة تحت */ }
  if (res.ok && data?.transaction?.id) return { success: true, transactionId: data.transaction.id };
  if (data?.errors) return { success: false, error: JSON.stringify(data.errors) };
  return { success: false, error: `شوبيفاي ردّت HTTP ${res.status} — ${raw.slice(0, 200)}` };
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

  // ① فحص top-level جوّه shopifyGQL · ② userErrors · ③ تأكيد الـ payload — تحت
  const data    = await shopifyGQL(env, token, mutation, variables, 'refundCreate');
  const payload = data?.data?.refundCreate;

  if (payload?.userErrors?.length > 0)
    return { success: false, error: payload.userErrors.map(e => e.message).join(', ') };
  if (payload?.refund?.id)
    return { success: true, refundId: payload.refund.id, amount: payload.refund.totalRefundedSet?.shopMoney?.amount };
  return { success: false, error: 'No refund returned from Shopify' };
}

// ══════════════════════════════════════════════════════
// §BOSTA — تحصيل بوسطة من ملف «Cash Cycles» (v3.11.0 · 04-11-2026)
// ══════════════════════════════════════════════════════
// الفكرة: بوسطة بتحصّل من العميل وبتحوّل لنا في تحويل واحد (Cash-out). الملف بيفصّل كل شحنة.
//   • على شوبيفاي: التسجيل على **الإجمالي** (COD + Online) بالظبط، من غير أي حساب شحن.
//   • في الخزنة: الرقم اللي بيتوّرد فعلاً = **Net Value** (بعد رسوم بوسطة) — بيتكتب في
//     `extra.courierCollect` عشان Treasury-Ledger تقراه من غير أي تعديل في طريقة القراءة.
//
// 🔴 قواعد الصف (أي مخالفة = الصف مايتسجّلش ويتعرض سببه — باقي الملف مايتأثرش):
//   Business ID ثابت · Payment Status = Paid · Cash-out ID وPaid At = نفس قيمة الملف ·
//   Order Type: SEND = S1 وأي قيمة تانية = S2 · الإجمالي (COD+Online) == مستحق شوبيفاي بالقرش ·
//   Net Value == COD + Online − Total Fees + Flex Ship Amount (±قرش) ·
//   custom.courier = Bosta · رقم التتبع == ميتافيلد S1/S2 المناسب.
// 🔴 قواعد الملف (Cash-out ID / Paid At موحّدين · شيت واحد اسمه Cash Cycles · الهيدر) بتتفحص في الواجهة
//   على الملف كله وبتوقف الملف؛ والـ Worker بيرفض أي صف مخالف لـ ctx اللي الواجهة بعتته.
//
// 🔴 الأمان من التكرار (درس بند 13 — 925 صف مكرر): كل صف بيتفحص في D1 بـ (cashOutId + trackingNumber)
//   قبل أي كتابة، وبيتعاد فحص شوبيفاي لحظة التسجيل. صفوف «بدون تحصيل» مالهاش أثر على شوبيفاي،
//   فحماية تكرارها الوحيدة هي فحص D1 ده.
// ⚠️ مفيش أي لمس لـ PRE_REG_KV (قرار أحمد — بند 14): الأوردر المسجّل مسبقًا بيتعلّم بس.
const BOSTA_BUSINESS_ID   = 'MrQkqmcexcHuuMo7n';
const BOSTA_SOURCE        = 'bosta_cash_cycle';
const BOSTA_COURIER       = 'Bosta';
// 🔴 أوردر اتشحن قبل ميتافيلدات رقم التتبع (13-09-2026) ماكانش بيتكتب عليه أي رقم تتبع (مسار bosta_synced/StyleBox القديم).
//   مفيش تعبئة بأثر رجعي (قرار أحمد 09-11-2026) → الأوردر القديم اللي ميتافيلداته التلاتة فاضية بيعدّي بعلامة trackingUnverified.
const BOSTA_TRACKING_CUTOFF = '2026-09-13T00:00:00Z';
const BOSTA_VALIDATE_MAX  = 15;       // حد الـ subrequests (اسم أوردر + KV لكل صف) — أقل من 50

// نص/رقم → قروش (integer). null لو فاضي أو مش رقم (مفيش "0" ضمني).
function bostaPiastres(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/,/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
const bostaFmt = p => (p / 100).toFixed(2);
const bostaBatchId = cashOutId => `bosta-${cashOutId}`;

function bostaCheckCtx(ctx) {
  const c = ctx || {};
  if (!/^[A-Za-z0-9_-]{3,60}$/.test(String(c.cashOutId || ''))) return 'Cash-out ID غير صالح';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(c.paidAt || '')) || Number.isNaN(Date.parse(c.paidAt + 'T00:00:00Z'))) return 'Paid At غير صالح';
  if (!Number.isInteger(c.rowsTotal) || c.rowsTotal < 1 || c.rowsTotal > 5000) return 'عدد صفوف الملف غير صالح';
  if (bostaPiastres(c.netTotal) === null) return 'مجموع Net Value غير صالح';
  if (!Number.isInteger(c.payOrders) || !Number.isInteger(c.refundOrders)) return 'عدّادات الملف ناقصة';
  return null;
}

function bostaNormRow(r) {
  const s = v => (v === null || v === undefined) ? '' : String(v).trim();
  const x = r || {};
  return {
    rowNo: Number.isInteger(x.rowNo) ? x.rowNo : null,
    tracking: s(x.trackingNumber), orderRef: s(x.orderRef), orderType: s(x.orderType).toUpperCase(),
    orderStatus: s(x.orderStatus), businessId: s(x.businessId), paymentStatus: s(x.paymentStatus),
    cashOutId: s(x.cashOutId), paidAt: s(x.paidAt).slice(0, 10),
    cod: bostaPiastres(x.cod), online: bostaPiastres(x.online), net: bostaPiastres(x.netValue),
    fees: bostaPiastres(x.totalFees), flex: s(x.flexShipAmount) === '' ? 0 : bostaPiastres(x.flexShipAmount),
  };
}

// فحوصات الصف بلا شبكة — بترجّع كل الأسباب مع بعض (الموظف يصلّحها مرة واحدة)
function bostaLocalReasons(n, ctx) {
  const why = [];
  if (n.businessId !== BOSTA_BUSINESS_ID) why.push(`Business ID («${n.businessId || 'فاضي'}») مش بتاع الشركة`);
  if (n.paymentStatus !== 'Paid') why.push(`Payment Status = «${n.paymentStatus || 'فاضي'}» مش Paid`);
  if (n.cashOutId !== ctx.cashOutId) why.push(`Cash-out ID («${n.cashOutId || 'فاضي'}») مختلف عن الملف (${ctx.cashOutId})`);
  if (n.paidAt !== ctx.paidAt) why.push(`Paid At («${n.paidAt || 'فاضي'}») مختلف عن الملف (${ctx.paidAt})`);
  if (!n.orderType) why.push('Order Type فاضي');
  if (!/^\d{5,15}$/.test(n.tracking)) why.push(`Order Id (رقم التتبع) «${n.tracking || 'فاضي'}» مش رقم صالح`);
  if (!/^#?\d{1,10}$/.test(n.orderRef)) why.push(`Order Reference «${n.orderRef || 'فاضي'}» مش رقم أوردر`);
  if (n.cod === null) why.push('COD فاضي أو مش رقم');
  if (n.online === null) why.push('Online Payment Amount فاضي أو مش رقم');
  else if (n.online < 0) why.push('Online Payment Amount سالب');
  if (n.fees === null) why.push('Total Fees فاضي أو مش رقم');
  if (n.flex === null) why.push('Flex Ship Amount مش رقم');
  if (n.net === null) why.push('Net Value فاضي أو مش رقم');
  if (n.cod !== null && n.online !== null && n.fees !== null && n.flex !== null && n.net !== null) {
    const calc = n.cod + n.online - n.fees + n.flex;
    if (Math.abs(calc - n.net) > 1) why.push(`Net Value (${bostaFmt(n.net)}) ≠ COD + Online − Total Fees + Flex Ship (${bostaFmt(calc)})`);
  }
  return why;
}

async function bostaFindOrderId(env, token, ref) {
  const num = String(ref).replace(/^#/, '');
  const data = await shopifyGQL(env, token,
    `query bostaFind($q: String!) { orders(first: 3, query: $q) { nodes { id name } } }`,
    { q: `name:#${num}` }, 'bostaFind');
  const hit = (data.data?.orders?.nodes || []).find(o => o.name === `#${num}`);
  return hit ? hit.id.replace('gid://shopify/Order/', '') : null;
}

const Q_BOSTA_ORDERS = `query bostaOrders($ids: [ID!]!) {
  nodes(ids: $ids) { ... on Order {
    id name createdAt cancelledAt displayFinancialStatus
    totalOutstandingSet { shopMoney { amount } }
    courier: metafield(namespace: "custom", key: "courier") { value }
    t1: metafield(namespace: "custom", key: "bosta_tracking_number_s1") { value }
    t2: metafield(namespace: "custom", key: "bosta_tracking_number_s2") { value }
    t0: metafield(namespace: "custom", key: "bosta_tracking_number") { value }
    transactions(first: 20) { id kind status amountSet { shopMoney { amount } } }
  } }
}`;

// صفوف اتسجّلت قبل كده لنفس الـ Cash-out (tool + نطاق timestamp — idx_logs_tool_ts)
async function bostaFindRegistered(db, cashOutId, paidAt, trackings) {
  const since = new Date(Date.parse(paidAt + 'T00:00:00Z') - 2 * 86400000).toISOString();
  const out = new Map();
  const list = [...new Set(trackings)];
  for (let i = 0; i < list.length; i += 40) {
    const part = list.slice(i, i + 40);
    const { results } = await db.prepare(
      `SELECT id, timestamp, type, order_name, json_extract(extra,'$.trackingNumber') AS tn
         FROM logs WHERE tool = ? AND timestamp >= ? AND type IN ('payment','refund')
          AND json_extract(extra,'$.source') = ? AND json_extract(extra,'$.cashOutId') = ?
          AND json_extract(extra,'$.trackingNumber') IN (${part.map(() => '?').join(',')})`
    ).bind(TOOL_NAME, since, BOSTA_SOURCE, cashOutId, ...part).all();
    for (const r of results || []) out.set(String(r.tn), r);
  }
  return out;
}

// التقييم الكامل — بيستخدمه validate (بلا كتابة) و bostaPay (قبل الكتابة مباشرة)
async function bostaEvaluate(env, rawRows, ctx) {
  const rows = rawRows.map(bostaNormRow);
  const res = rows.map(n => ({
    rowNo: n.rowNo, tracking: n.tracking, orderRef: n.orderRef, orderName: null, orderId: null,
    slot: n.orderType === 'SEND' ? 'S1' : 'S2', status: 'error', reasons: [], kind: null,
    gross: (n.cod !== null && n.online !== null) ? bostaFmt(n.cod + n.online) : null,
    net: n.net !== null ? bostaFmt(n.net) : null, shopify: null, preRegistered: null,
    financialStatus: null, trackingUnverified: false, _n: n, _sale: [],
  }));

  // ① فحوصات بلا شبكة + تكرار داخل الدفعة
  const seenT = new Set(), seenR = new Set();
  res.forEach(r => {
    r.reasons.push(...bostaLocalReasons(r._n, ctx));
    if (r.tracking) { if (seenT.has(r.tracking)) r.reasons.push('رقم التتبع متكرر في الملف'); seenT.add(r.tracking); }
    // نفس الأوردر/الـ slot أكتر من مرة (شحنة اتلغت وبديلها — كل واحدة برقم تتبع مختلف) مسموح،
    // بشرط صف واحد بس عليه فلوس؛ الباقي لازم يكون صفر (رسوم/ملغي). مضاعفة التحصيل ممنوعة.
    const rk = r._n.orderRef.replace(/^#/, '') + '|' + r.slot;
    const nonZero = r._n.cod !== null && r._n.online !== null && (r._n.cod + r._n.online) !== 0;
    if (r._n.orderRef && nonZero) { if (seenR.has(rk)) r.reasons.push('نفس الأوردر متكرر في الملف لنفس الشحنة (S1/S2) وعليه أكتر من صف بمبلغ'); seenR.add(rk); }
  });
  let live = res.filter(r => !r.reasons.length);

  // ② اتسجّل قبل كده؟ (D1) — قبل شوبيفاي: بعد التحصيل المستحق بيبقى صفر ومش هيطابق
  if (live.length) {
    const reg = await bostaFindRegistered(env.DB, ctx.cashOutId, ctx.paidAt, live.map(r => r.tracking));
    for (const r of live) {
      const hit = reg.get(r.tracking);
      if (hit) { r.status = 'done'; r.orderName = hit.order_name; r.reasons.push(`اتسجّل قبل كده (${String(hit.timestamp).slice(0, 16).replace('T', ' ')} UTC)`); }
    }
    live = live.filter(r => r.status !== 'done');
  }
  if (!live.length) return res;

  // ③ شوبيفاي
  const token = await getAccessToken(env);
  if (!token) throw new Error('Failed to get Shopify access token');
  for (let i = 0; i < live.length; i += 5) {
    await Promise.all(live.slice(i, i + 5).map(async r => { r.orderId = await bostaFindOrderId(env, token, r._n.orderRef); }));
  }
  live.filter(r => !r.orderId).forEach(r => r.reasons.push(`الأوردر ${r._n.orderRef.startsWith('#') ? r._n.orderRef : '#' + r._n.orderRef} مش موجود على شوبيفاي`));
  const found = live.filter(r => r.orderId);
  const nodes = new Map();
  if (found.length) {
    const data = await shopifyGQL(env, token, Q_BOSTA_ORDERS, { ids: found.map(r => `gid://shopify/Order/${r.orderId}`) }, 'bostaOrders');
    for (const nd of data.data?.nodes || []) if (nd?.id) nodes.set(nd.id.replace('gid://shopify/Order/', ''), nd);
  }
  await Promise.all(found.map(async r => {
    const nd = nodes.get(r.orderId), n = r._n;
    if (!nd) { r.reasons.push('شوبيفاي ما رجّعتش بيانات الأوردر'); return; }
    r.orderName = nd.name; r.financialStatus = nd.displayFinancialStatus;
    const gross = n.cod + n.online;
    const out = bostaPiastres(nd.totalOutstandingSet?.shopMoney?.amount);
    r.shopify = out === null ? null : bostaFmt(out);
    if (out === null) r.reasons.push('شوبيفاي ما رجّعتش المستحق');
    else if (out !== gross) {
      r.reasons.push(`الإجمالي في الملف (${bostaFmt(gross)}) ≠ مستحق شوبيفاي (${bostaFmt(out)})`
        + (nd.cancelledAt && gross !== 0 ? ' — الأوردر ملغي' : '')
        + (out === 0 && gross > 0 ? ' — شوبيفاي مفيهاش مستحق (اتحصّل قبل كده؟ راجع السجل)' : ''));
    }
    const courier = nd.courier?.value || null;
    if (courier !== BOSTA_COURIER) r.reasons.push(`المندوب على شوبيفاي «${courier || 'فاضي'}» مش ${BOSTA_COURIER}`);
    const want = r.slot === 'S1' ? (nd.t1?.value || nd.t0?.value || null) : (nd.t2?.value || null);
    const noTrackingAtAll = !nd.t1?.value && !nd.t2?.value && !nd.t0?.value;
    const legacyOrder = noTrackingAtAll && nd.createdAt && Date.parse(nd.createdAt) < Date.parse(BOSTA_TRACKING_CUTOFF);
    if (!want && legacyOrder) r.trackingUnverified = true;   // أوردر قديم بلا رقم تتبع مسجّل — بيعدّي والباقي (مبلغ · مندوب · Net) شغّال
    else if (!want) r.reasons.push(`رقم التتبع ${r.slot} مش مسجّل على الأوردر في شوبيفاي`);
    else if (String(want).trim() !== r.tracking) r.reasons.push(`رقم التتبع (${r.tracking}) ≠ ${r.slot} على شوبيفاي (${String(want).trim()})`);
    r._sale = (nd.transactions || []).filter(t => t.kind === 'SALE' && t.status === 'SUCCESS')
      .map(t => ({ id: t.id, amount: parseFloat(t.amountSet?.shopMoney?.amount || '0') })).filter(t => t.amount > 0);
    if (gross < 0) {
      const cap = Math.round(r._sale.reduce((s, t) => s + t.amount, 0) * 100);
      if (cap < -gross) r.reasons.push(`معاملات البيع الناجحة (${bostaFmt(cap)}) أقل من الاسترداد (${bostaFmt(-gross)})`);
    }
    r.kind = gross > 0 ? 'payment' : gross < 0 ? 'refund' : 'none';
  }));

  // ④ علامة «مسجّل مسبقًا» (معلومة بس — مفيش لمس للـ KV)
  await Promise.all(found.filter(r => !r.reasons.length).map(async r => {
    try { r.preRegistered = !!(await checkPendingPreReg(env, r.orderId)); } catch { r.preRegistered = null; }
  }));

  res.forEach(r => { if (r.status !== 'done') r.status = r.reasons.length ? 'error' : (r.kind === 'none' ? 'ready_zero' : 'ready'); });
  return res;
}

const bostaPublic = r => { const { _n, _sale, ...pub } = r; return pub; };

// extra الصف — شكله نفس buildPayExtra (عقد Treasury-Ledger) + حقول بوسطة
function buildBostaExtra({ n, r, ctx, result, actions }) {
  const gross = n.cod + n.online;
  return {
    result, actions: Array.isArray(actions) ? actions : [],
    batchId: bostaBatchId(ctx.cashOutId), courier: BOSTA_COURIER,
    // 🔴 الرقم اللي الخزنة بتتوقعه = Net Value (بعد الرسوم)، مش المحصَّل على شوبيفاي
    courierCollect: Number((n.net / 100).toFixed(2)),
    paymentMethods: null, pmScope: 'session', sessionPaymentMethods: null,
    paymentAccounts: null, sessionPaymentAccounts: null,
    batchExpected: {
      orders: ctx.rowsTotal, payOrders: ctx.payOrders, refundOrders: ctx.refundOrders,
      collect: bostaFmt(bostaPiastres(ctx.netTotal)), extraShippingTotal: '0.00', net: bostaFmt(bostaPiastres(ctx.netTotal)), methods: null,
    },
    extraShipping: null, extraShippingTotal: '0.00',
    isRefund: r.kind === 'refund', refundAmount: r.kind === 'refund' ? Number((-gross / 100).toFixed(2)) : null,
    lineItems: null, returnedItems: null, orderDiscount: null,
    preRegistered: r.preRegistered === true, hasReturn: n.orderType !== 'SEND', returnShipping: null,
    orderKind: null, multiCycle: false,
    // — حقول بوسطة —
    source: BOSTA_SOURCE, cashOutId: ctx.cashOutId, paidAt: ctx.paidAt, trackingNumber: n.tracking,
    bostaOrderType: n.orderType, slot: r.slot, bostaOrderStatus: n.orderStatus || null,
    codAmount: bostaFmt(n.cod), onlineAmount: bostaFmt(n.online), grossCollected: bostaFmt(gross),
    bostaFees: bostaFmt(n.fees), flexShipAmount: bostaFmt(n.flex), netValue: bostaFmt(n.net),
    shopifyCaptured: r.kind === 'none' ? '0.00' : bostaFmt(Math.abs(gross)), noCollection: r.kind === 'none',
    trackingUnverified: r.trackingUnverified === true,
  };
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
          // 🔴 v3.6.0 — نفس `classifyPreReg` اللي `pay` بيستخدمها بالحرف، فالمبلغ
          //    المعروض == المبلغ اللي هيتكتب. قبل كده الفرع ده كان بيعرض
          //    «التسجيل المسبق + المتبقي» (أو التسجيل بس لو فيه return)، و`pay`
          //    بيسجّل المتبقي على شوبيفاي — رقمين مختلفين لنفس الأوردر.
          //    الـ S2 بيفضل `null` في الرد عن قصد: الصف ده تحصيل S1، وحالة S2
          //    (Confirmed + EXCHANGE مثلاً) مش خطأ فيه — المتبقي بتاعها في `s2Due`.
          const cls = classifyPreReg(pending, {
            outstanding: parseFloat(orderData.outstanding), s2: orderData.s2, hasReturn: orderData.hasReturn,
          });
          return json({
            success: true, orderId: numericId, orderName: orderData.orderName || pending.orderName,
            amount: pending.amount, subtotal: pending.subtotal, shippingAmount: pending.shippingAmount,
            canMarkAsPaid: true, skipReason: null, financialStatus: orderData.financialStatus,
            courier: orderData.courier || pending.courier, lineItems: pending.lineItems,
            orderDiscount: orderData.orderDiscount, preRegistered: true, registeredAt: pending.preRegisteredAt,
            cancelled: false, hasReturn: false, returnShipping: '0.00', returnedItems: [],
            orderKind: 'normal', cycleCount: 0, multiCycle: false,
            saleTransactions: [], s1: orderData.s1, s2: null,
            s2Due: cls.s2Due != null ? cls.s2Due.toFixed(2) : null,
            preRegBlock: cls.block,
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
            orderKind: orderData.orderKind, cycleCount: orderData.cycleCount, multiCycle: orderData.multiCycle,
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
          orderKind: orderData.orderKind, cycleCount: orderData.cycleCount, multiCycle: orderData.multiCycle,
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
          if (!token) return json({ success: false, status: 'error', error: 'Failed to get Shopify access token' }, 200, request);

          // ⚠️ بترمي عند أي فشل استعلام — مفيش أي قيمة افتراضية هنا.
          const state = await getPreRegPayState(token, env, numericId);
          const cls   = classifyPreReg(pending, state);

          // ⛔ v3.6.0 — حالة مش متوقعة: بنوقف **قبل** أي كتابة (KV · D1 · شوبيفاي).
          //    `blocked:true` بيخلّي الواجهة توقف الجلسة كلها مش الأوردر ده بس.
          if (cls.block) {
            return json({ success: false, status: 'error', blocked: true, error: cls.block, actions: [] }, 200, request);
          }

          // 🔴 v3.6.0 — حارس اتفاق: المبلغ اللي الواجهة عرضته واتقسمت عليه طرق
          //    الدفع لازم يساوي مبلغ التسجيل المسبق. أي فرق = الواجهة والـ Worker
          //    شايفين أوردر مختلف (ده بالظبط اللي حصل في #55851) → وقف من غير كتابة.
          if (Math.abs(parsedAmount - cls.preRegAmount) > 0.005) {
            return json({
              success: false, status: 'error', blocked: true, actions: [],
              error: `⛔ المبلغ المعروض (${parsedAmount.toFixed(2)} ج) ≠ مبلغ التسجيل المسبق (${cls.preRegAmount.toFixed(2)} ج) — العملية اتوقفت. احذف الأوردر من الجدول وضيفه تاني.`,
            }, 200, request);
          }

          // Step 5A ⑤ — بتتملى أول بأول، مش بترجع من دالة في الآخر
          const actions = [`بدون أي تسجيل على شوبيفاي — المبلغ مسجّل مسبقًا (${cls.preRegAmount.toFixed(2)} ج)`];
          if (cls.s2Due) actions.push(`متبقي S2 ${cls.s2Due.toFixed(2)} ج فاضل على شوبيفاي — بيتحصّل مع شحنة S2`);

          const cleared = await clearPendingPreReg(env, numericId);
          if (cleared) actions.push('مسح التسجيل المسبق من PRE_REG_KV');
          const warning = cleared ? null : 'مسح التسجيل المسبق من PRE_REG_KV فشل — الأوردر ممكن يظهر تاني كـ"مسجل مسبقاً". امسح المفتاح يدويًا.';
          const status  = warning ? 'warning' : 'success';

          // 🔴 v3.6.0 — `valueAfter` = اللي المندوب سلّمه للأوردر ده (مبلغ التسجيل
          //    المسبق) — مش اللي اتسجّل على شوبيفاي. قبل كده كان صفر أو المتبقي،
          //    فمجموع «تحصيل» الجلسة في السجل ماكانش بيطابق طرق الدفع.
          const { logged, logError } = await safeWriteLog(env.DB, {
            tool: TOOL_NAME, type: 'payment', employee: employee || null,
            orderId: numericId, orderName: orderName || pending.orderName || null,
            valueAfter: cls.preRegAmount,
            notes: 'تحصيل (كان مسجل مسبقاً)'
              + (cls.s2Due ? ` — متبقي S2 ${cls.s2Due.toFixed(2)} ج على شوبيفاي` : '')
              + (warning ? ` — ⚠ ${warning}` : ''),
            extra: {
              ...buildPayExtra({ batchId, sessionMeta, orderMeta, courier: pending.courier, isRefund: false, result: status, actions }),
              shopifyCaptured: 0,
              preRegAmount:    cls.preRegAmount,
              s2Due:           cls.s2Due,
            },
          });
          return json({
            success: true, status, actions, logged, logError,
            orderId: numericId, preRegistered: true,
            amount: cls.preRegAmount.toFixed(2), shopifyCaptured: '0.00',
            s2Due: cls.s2Due != null ? cls.s2Due.toFixed(2) : null,
            ...(warning ? { warning } : {}),
          }, 200, request);
        }

        const token = await getAccessToken(env);
        if (!token) return json({ success: false, status: 'error', error: 'Failed to get Shopify access token' }, 200, request);

        const actions  = [];
        const txResult = await createTransaction(token, env, numericId, parsedAmount.toFixed(2));
        if (txResult.success) {
          actions.push(`تحصيل ${parsedAmount.toFixed(2)} ج على شوبيفاي`);
          const { logged, logError } = await safeWriteLog(env.DB, {
            tool: TOOL_NAME, type: 'payment', employee: employee || null,
            orderId: numericId, orderName: orderName || null,
            valueAfter: parsedAmount, notes: null,
            extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: sessionMeta?.courier, isRefund: false, result: 'success', actions }),
          });
          return json({ success: true, status: 'success', actions, logged, logError, orderId: numericId, transactionId: txResult.transactionId, amount: parsedAmount.toFixed(2) }, 200, request);
        }
        return json({ success: false, status: 'error', error: txResult.error, actions }, 200, request);
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
        if (!token) return json({ success: false, status: 'error', error: 'Failed to get Shopify access token' }, 200, request);

        const actions      = [];
        const refundResult = await createRefund(token, env, numericId, saleTransactions, parsedAmount.toFixed(2), currency || 'EGP');

        if (refundResult.success) {
          actions.push(`استرداد ${parsedAmount.toFixed(2)} ج على شوبيفاي`);
          const { logged, logError } = await safeWriteLog(env.DB, {
            tool: TOOL_NAME, type: 'refund', employee: employee || null,
            orderId: numericId, orderName: orderName || null,
            valueAfter: parsedAmount, notes: null,
            extra: buildPayExtra({ batchId, sessionMeta, orderMeta, courier: sessionMeta?.courier, isRefund: true, refundAmount: parsedAmount, result: 'success', actions }),
          });
          return json({ success: true, status: 'success', actions, logged, logError, orderId: numericId, refundId: refundResult.refundId, amount: parsedAmount.toFixed(2) }, 200, request);
        }
        return json({ success: false, status: 'error', error: refundResult.error, actions }, 200, request);
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

        const data = await shopifyGQL(env, token, query, {}, 'metafieldDefinitions');
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
        // سقف حماية — الحلقة كانت مفتوحة بلا حد (بينما listPendingPreReg
        // جنبها عندها سقف 20 صفحة). 40 صفحة × 50 = 2000 أوردر لمندوب واحد.
        let pages = 0;
        const MAX_PAGES = 40;

        while (hasNextPage && pages++ < MAX_PAGES) {
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
          const data = await shopifyGQL(env, token, gqlQuery, { query: queryStr, after: cursor }, 'getCourierOrders');
          const ordersData = data?.data?.orders;
          if (!ordersData) throw new Error('getCourierOrders: شوبيفاي ما رجّعتش أوردرات — الاستعلام فشل');

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

        // الوصول للسقف والصفحات لسه فيها كمان = نتيجة **ناقصة**، متتعرضش كأنها كاملة
        if (hasNextPage) {
          return json({
            success: true, orders: fetchedOrders, count: fetchedOrders.length, truncated: true,
            warning: `النتيجة اتقصّت عند ${fetchedOrders.length} أوردر (سقف ${MAX_PAGES} صفحة) — فيه أوردرات تانية للمندوب ده مش معروضة.`,
          }, 200, request);
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
          // ⚠️ `|| []` هنا آمنة دلوقتي — أي فشل استعلام بيترمي من shopifyGQL.
          //    قبل v3.5.0 كانت بتاكل الدفعة كلها في صمت = أوردرات مش بتتحصّل.
          const data  = await shopifyGQL(env, token, gqlQuery, { ids: chunk }, 'getOrdersByIds');
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

      // ── ACTION: bostaValidate (v3.11.0) — فحص صفوف ملف Cash Cycles بلا أي كتابة ──
      if (action === 'bostaValidate') {
        const { rows, ctx } = bodyData;
        const ctxErr = bostaCheckCtx(ctx);
        if (ctxErr) return json({ error: ctxErr }, 400, request);
        if (!Array.isArray(rows) || !rows.length) return json({ error: 'rows is required' }, 400, request);
        if (rows.length > BOSTA_VALIDATE_MAX) return json({ error: `الحد ${BOSTA_VALIDATE_MAX} صف في النداء` }, 400, request);
        const results = await bostaEvaluate(env, rows, ctx);
        return json({ success: true, results: results.map(bostaPublic) }, 200, request);
      }

      // ── ACTION: bostaPay (v3.11.0) — تسجيل صف واحد (تحصيل/استرداد/بدون تحصيل) ──
      // بيعيد التقييم كامل (D1 + شوبيفاي) لحظة الكتابة — الـ validate اللي فات ممكن يبقى قديم.
      if (action === 'bostaPay') {
        const { row, ctx, employee } = bodyData;
        const ctxErr = bostaCheckCtx(ctx);
        if (ctxErr) return json({ error: ctxErr }, 400, request);
        if (!row || typeof row !== 'object') return json({ error: 'row is required' }, 400, request);
        if (!employee) return json({ error: 'employee is required' }, 400, request);

        const [r] = await bostaEvaluate(env, [row], ctx);
        if (r.status === 'done') {
          return json({ success: true, status: 'already', alreadyRegistered: true, actions: [r.reasons.join(' • ')], logged: true, orderId: r.orderId }, 200, request);
        }
        if (r.status !== 'ready' && r.status !== 'ready_zero') {
          return json({ success: false, status: 'error', error: r.reasons.join(' • ') || 'الصف مش جاهز', actions: [] }, 200, request);
        }

        const n = r._n, gross = n.cod + n.online, actions = [];
        const token = await getAccessToken(env);
        if (!token) return json({ success: false, status: 'error', error: 'Failed to get Shopify access token', actions }, 200, request);

        if (r.kind === 'payment') {
          const tx = await createTransaction(token, env, r.orderId, bostaFmt(gross));
          if (!tx.success) return json({ success: false, status: 'error', error: tx.error, actions }, 200, request);
          actions.push(`تحصيل ${bostaFmt(gross)} ج على شوبيفاي (بوسطة ${ctx.cashOutId})`);
        } else if (r.kind === 'refund') {
          const rf = await createRefund(token, env, r.orderId, r._sale, bostaFmt(-gross), 'EGP');
          if (!rf.success) return json({ success: false, status: 'error', error: rf.error, actions }, 200, request);
          actions.push(`استرداد ${bostaFmt(-gross)} ج على شوبيفاي (بوسطة ${ctx.cashOutId})`);
        } else {
          actions.push('بدون تحصيل على شوبيفاي — الصف اتسجّل لرسوم/خصم بوسطة (Net Value)');
        }
        if (r.preRegistered) actions.push('الأوردر مسجّل مسبقًا — PRE_REG_KV ما اتلمسش');

        const { logged, logError } = await safeWriteLog(env.DB, {
          tool: TOOL_NAME, type: r.kind === 'refund' ? 'refund' : 'payment', employee,
          orderId: r.orderId, orderName: r.orderName,
          valueAfter: Math.abs(gross) / 100,
          notes: (r.kind === 'refund' ? 'استرداد بوسطة' : r.kind === 'none' ? 'بوسطة — بدون تحصيل' : 'تحصيل بوسطة') + ` — ${ctx.cashOutId}`,
          extra: buildBostaExtra({ n, r, ctx, result: 'success', actions }),
        });
        return json({ success: true, status: 'success', actions, logged, logError, orderId: r.orderId, kind: r.kind, amount: bostaFmt(Math.abs(gross)) }, 200, request);
      }

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
        // الشكل المعتمد: مصفوفة [{ ok, label, detail }] بـ `ok` صريحة
        // (worker-builder § توحيد شكل checks). المفتاح كان `check` لحد v3.4.0،
        // والمُطبِّع الرسمي بيقرا `c.label || c.name` فكان بيعرض undefined.
        const checks = [];

        for (const k of ['WORKER_SECRET', 'CLIENT_ID', 'CLIENT_SECRET']) {
          const v = env[k];
          checks.push({ label: `env.${k}`, ok: !!v, detail: v ? `موجود (${String(v).length} حرف)` : 'ناقص' });
        }
        for (const k of ['SHOP_DOMAIN']) {
          const v = env[k];
          checks.push({ label: `env.${k}`, ok: !!v, detail: v ? String(v) : 'ناقص' });
        }

        checks.push({
          label: 'DB binding (D1)', ok: !!env.DB,
          detail: env.DB ? 'موجود' : 'ناقص — تسجيل الدخول وتاب السجل هيفشلوا',
        });
        checks.push({
          label: 'PRE_REG_KV binding (KV)', ok: !!env.PRE_REG_KV,
          detail: env.PRE_REG_KV ? 'موجود' : 'ناقص — التسجيل المسبق هيفشل (namespace: pre-register-payment-cod-KV)',
        });

        // متغيرات وbindings ملغاة لسه في الداشبورد — مش أخطاء قاتلة، لكن
        // وجودها معناه تنظيف ناقص، وبيلخبط أي جرد مستقبلي.
        for (const k of ['PREREG_WORKER_URL', 'PREREG_WORKER_SECRET', 'OSU_WORKER_URL', 'OSU_WORKER_SECRET']) {
          if (env[k] !== undefined) {
            checks.push({ label: `env.${k} — ملغى`, ok: false, detail: 'موجود في الداشبورد لكن الكود مش بيستخدمه — امسحه' });
          }
        }
        if (env.OSU_SERVICE) {
          checks.push({ label: 'Service binding OSU_SERVICE — ملغى', ok: false, detail: 'موجود لكن الكود مش بيستخدمه من v3.1.0 — امسحه من تاب Bindings' });
        }

        try {
          const token = await getAccessToken(env);
          if (!token) throw new Error('OAuth رجّع من غير access_token');
          const data = await shopifyGQL(env, token, '{ currentAppInstallation { accessScopes { handle } } }', {}, 'accessScopes');
          const scopes = (data?.data?.currentAppInstallation?.accessScopes || []).map(s => s.handle);
          checks.push({ label: 'Shopify OAuth + صلاحيات التطبيق', ok: true, detail: scopes.join(', ') || 'مفيش scopes' });
        } catch (e) {
          checks.push({ label: 'Shopify OAuth + صلاحيات التطبيق', ok: false, detail: e.message });
        }

        try {
          await env.DB.prepare('SELECT 1').first();
          checks.push({ label: 'D1 query', ok: true, detail: 'تم' });
        } catch (e) {
          checks.push({ label: 'D1 query', ok: false, detail: e.message });
        }

        try {
          assertPreRegKV(env);
          const probe = await env.PRE_REG_KV.list({ prefix: PREREG_PREFIX, limit: 10 });
          checks.push({
            label: 'KV read (PRE_REG_KV)', ok: true,
            detail: `تم — ${(probe.keys || []).length} مفتاح في أول صفحة${probe.list_complete ? ' (وده الإجمالي)' : ' (فيه أكتر)'}`,
          });
        } catch (e) {
          checks.push({ label: 'KV read (PRE_REG_KV)', ok: false, detail: e.message });
        }

        checks.push({ label: 'Origin', ok: true, detail: request.headers.get('Origin') || '(بدون)' });
        checks.push({ label: 'ALLOWED_ORIGINS', ok: true, detail: ALLOWED_ORIGINS.join(', ') });

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
      // v3.8.0: orders · timeFrom/timeTo · count/collect/refund (From/To/In) + get_log_suggest + get_log_num_values
      const logArgs = () => {
        const q = k => url.searchParams.get(k);
        return {
          tool:     q('tool')     || TOOL_NAME,
          employee: q('employee') || null,
          type:     q('type')     || null,
          courier:  q('courier')  || null,
          search:   q('search')   || null,
          dateFrom: q('dateFrom') || null,
          dateTo:   q('dateTo')   || null,
          orders:   q('orders')   || null,
          timeFrom: q('timeFrom') || null,
          timeTo:   q('timeTo')   || null,
          num: (() => {
            const o = {};
            for (const k of Object.keys(NUM_COL)) o[k] = numSpec({ from: q(k + 'From'), to: q(k + 'To'), list: q(k + 'In') }, k);
            return Object.values(o).some(Boolean) ? o : null;
          })(),
        };
      };
      // employee/type/courier بقوا يقبلوا قايمة comma-separated (اختيار متعدد)
      // + dateFrom/dateTo (تاريخ القاهرة YYYY-MM-DD) — v3.0.0.
      if (action === 'get_logs') {
        const entries = await getLogs(env.DB, {
          ...logArgs(),
          limit:    parseInt(url.searchParams.get('limit')  || '100'),
          offset:   parseInt(url.searchParams.get('offset') || '0'),
        });
        return json({ ok: true, entries }, 200, request);
      }

      if (action === 'get_logs_count') {
        const total = await getLogsCount(env.DB, logArgs());
        return json({ ok: true, total }, 200, request);
      }

      if (action === 'get_logs_export') {
        const out = await getLogsExport(env.DB, logArgs());
        // cap/total/truncated إلزاميين — من غيرهم الواجهة بتقول "تم التصدير ✓"
        // على ملف مقصوص (html-builder Standards #30)
        return json({ ok: true, ...out }, 200, request);
      }

      // اقتراحات رقم الأوردر (لايف): أحدث الأوردرات المطابقة + عدد عملياتها. أول ١٠ + الباقي في `total`.
      if (action === 'get_log_suggest') {
        const parts = parseOrderTokens(url.searchParams.get('q'));
        const last = parts[parts.length - 1];
        if (!last) return json({ ok: true, suggestions: [], total: 0 }, 200, request);
        const exclude = parseOrderTokens(url.searchParams.get('exclude'));
        const tool = url.searchParams.get('tool') || TOOL_NAME;
        let where = "tool = ? AND type NOT IN ('login','logout','extra_shipping') AND order_name LIKE ?";
        const b = [tool, `%${last}%`];
        if (exclude.length) { where += ` AND ${exclude.map(() => "order_name NOT LIKE ?").join(' AND ')}`; b.push(...exclude.map(t => `%#${t}`)); }
        const rows = (await env.DB.prepare(`SELECT order_name AS name, COUNT(*) AS n, MAX(timestamp) AS ts FROM logs WHERE ${where} GROUP BY order_name ORDER BY ts DESC LIMIT 10`).bind(...b).all()).results || [];
        const tot = await env.DB.prepare(`SELECT COUNT(DISTINCT order_name) AS c FROM logs WHERE ${where}`).bind(...b).first();
        return json({ ok: true, suggestions: rows.map(r => ({ name: r.name, count: r.n })), total: tot?.c ?? rows.length }, 200, request);
      }

      // قيم الفلتر الرقمي (قايمة القيم): القيم المميزة لمجاميع الجلسة + عدد الجلسات لكل قيمة، الأكتر تكرارًا الأول (حد ١٠٠).
      if (action === 'get_log_num_values') {
        const field = url.searchParams.get('field');
        if (!NUM_COL[field]) return json({ ok: false, error: 'field غير معروف' }, 400, request);
        const tool = url.searchParams.get('tool') || TOOL_NAME;
        const col = NUM_COL[field];
        const rows = (await env.DB.prepare(`SELECT ${col} AS v, COUNT(*) AS n FROM (${sessionAggSQL(tool)}) GROUP BY ${col} ORDER BY n DESC, v ASC LIMIT 100`).bind(tool).all()).results || [];
        const tot = await env.DB.prepare(`SELECT COUNT(DISTINCT ${col}) AS c FROM (${sessionAggSQL(tool)})`).bind(tool).first();
        return json({ ok: true, values: rows.map(r => ({ v: r.v, n: r.n })), total: tot?.c ?? rows.length }, 200, request);
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