# COD Payment Center

أداة EcomModa الداخلية لتحصيل واسترداد فلوس أوردرات **الدفع عند الاستلام (COD)** لكل مندوب، مع سجل حركة كامل.

| | |
|---|---|
| **الواجهة** | https://ecommoda-dev.github.io/COD-Payment-Center/ |
| **الـ Worker** | https://cod-payment-center-worker.ecommoda-dev.workers.dev |
| **الإصدار** | Worker `v3.3.0` · الواجهة `v3.2.0` |

## البنية

```
index.js       ← كود الـ Worker (Cloudflare Workers)
wrangler.toml  ← الاسم + الـ bindings + الـ vars
index.html     ← الواجهة (GitHub Pages)
Index.html     ← صفحة تحويل للروابط القديمة فقط
CLAUDE.md      ← قواعد الأداة · خط الأساس · الفخاخ · المسائل المفتوحة
```

## النشر

آلي بالكامل — أي `push` على `main` بينشر:

- **الـ Worker** عبر Cloudflare Workers Builds (~٢٣ ثانية)
- **الواجهة** عبر GitHub Pages (أبطأ — استنى دقيقة–اتنين)

> ⚠️ **ممنوع لصق كود في داشبورد Cloudflare بعد الربط** — أول `push` بيمسحه.
> الريبو ده هو المصدر الوحيد للكود المنشور.

التفاصيل الكاملة (الـ bindings المضبوطة · الأسرار · الفخاخ · النسخ القديمة) في [`CLAUDE.md`](./CLAUDE.md).
