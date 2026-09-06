<div dir="rtl" style="text-align: right;">

# COD Payment Center

![version](https://img.shields.io/badge/version-v1.1.0-blue)

أداة EcomModa الداخلية لتحصيل واسترداد فلوس أوردرات **الدفع عند الاستلام (COD)** لكل مندوب، مع سجل حركة كامل.

| | |
|---|---|
| **الواجهة** | https://ecommoda-dev.github.io/COD-Payment-Center/ |
| **الـ Worker** | https://cod-payment-center-worker.ecommoda-dev.workers.dev |
| **الإصدار** | Worker `v3.5.0` · الواجهة `v3.4.0` |

> الرقمين **مستقلين بالتصميم** واختلافهم وضع طبيعي. اللي بيتفحص هو الحد الأدنى
> (`MIN_WORKER_VERSION` في الواجهة)، مش التطابق.

## البنية

```
index.js       ← كود الـ Worker (Cloudflare Workers)
wrangler.toml  ← الاسم + الـ bindings + الـ vars
index.html     ← الواجهة (GitHub Pages)
Index.html     ← صفحة تحويل للروابط القديمة فقط
CLAUDE.md      ← قواعد الأداة · خط الأساس · الفخاخ · المسائل المفتوحة
```

## الإعداد لأول مرة على أي جهاز

الموظف بيدخّل **الـ Worker Secret بس** من ⚙️ الإعدادات. رابط الـ Worker ورابط
لوحة الموظفين ثابتين في الكود ومش حقول إدخال — الرابط مش سر، والحماية في الـ
Secret + الـ CORS allowlist.

بعدها زرار **🩺 افحص الأداة والاتصالات** في نفس النافذة بيتأكد من الاتصال
والـ bindings وصلاحيات شوبيفاي قبل أي تحصيل.

## النشر

آلي بالكامل — أي `push` على `main` بينشر:

- **الـ Worker** عبر Cloudflare Workers Builds (~٢٣ ثانية)
- **الواجهة** عبر GitHub Pages (أبطأ — استنى دقيقة–اتنين)

> ⚠️ **ممنوع لصق كود في داشبورد Cloudflare بعد الربط** — أول `push` بيمسحه.
> الريبو ده هو المصدر الوحيد للكود المنشور.

التفاصيل الكاملة (الـ bindings المضبوطة · الأسرار · الفخاخ · النسخ القديمة) في [`CLAUDE.md`](./CLAUDE.md).

آخر تحديث: 06-09-2026 — 18:40

</div>
