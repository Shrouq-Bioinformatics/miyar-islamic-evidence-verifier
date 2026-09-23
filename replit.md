# مِعيار — Islamic Evidence Verifier

مساحة عربية للتحقق من الادعاءات الإسلامية وربطها بالمصادر، مع فصل واضح بين الدليل المؤيد وحالات الحاجة إلى مراجعة بشرية.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/miyar-evidence-verifier/src/App.tsx` — تجربة التطبيق كاملة وربط سجل مساحة الفريق.
- `artifacts/miyar-evidence-verifier/src/index.css` — رموز الهوية البصرية ودعم RTL.
- `artifacts/miyar-evidence-verifier/src/components/` — مكونات الواجهة القابلة لإعادة الاستخدام.
- `artifacts/miyar-evidence-verifier/src/pages/` — الحالات والصفحات الداعمة.
- `artifacts/api-server/src/routes/verify.ts` — تحليل المطالبات مع استرجاع مقتطفات وضبط مخرجات المزود.
- `artifacts/api-server/src/lib/evidence.ts` — فهرس الأدلة المنقح ومطابقة المطالبة بالمقتطفات.
- `artifacts/api-server/src/routes/cases.ts` — حفظ الحالات وقرارات المراجعة في PostgreSQL.
- `docs/miyar-submission.md` — ملخص المشكلة والحل والمصادر ومعيار النجاح وتدفق العرض.

## Architecture decisions

- التطبيق يستخدم واجهة React وخادم Express وقاعدة PostgreSQL؛ حالات العرض النموذجية منفصلة عن حالات الفريق المحفوظة.
- المسار المختار هو أدوات المعرفة والتحقق؛ لذلك تُعرض حالة الدليل، المصدر، وحدود الإجابة كجزء أساسي من المنتج لا كإضافة تجميلية.
- الواجهة عربية RTL أولًا، مع حالات الامتناع والإحالة إلى المختص بدل تقديم ثقة زائفة في المسائل غير الكافية.
- خدمة التحقق تستخدم بوابة OpenAI المُدارة في Replit مع مقتطفات الأدلة المسترجعة؛ عند تعذر المزود يتوقف المسار برسالة صريحة بدل عرض نتيجة محلية كأنها تحليل AI.

## Product

- لوحة قيادة لسجل الفحوصات وجودة الأدلة.
- تدقيق ادعاء جديد مع تصنيف مدعوم / يحتاج مراجعة / أدلة غير كافية.
- قائمة مراجعة بشرية ومكتبة مصادر وتحليلات تشغيلية وإعدادات السلامة.
- كل التفاعلات الأساسية تعمل محليًا: إنشاء فحص، مراجعة، اعتماد، حفظ مصدر، وتعديل بوابة المراجعة.

## User preferences

لا توجد تفضيلات إضافية محفوظة.

## Gotchas

- تشغيل الواجهة يحتاج workflow الخاص بها حتى تتوفر قيم `PORT` و`BASE_PATH`.
- لا يُقدّم المنتج فتوى؛ حالات عدم كفاية الدليل يجب أن تبقى واضحة ومتصلة بمسار إحالة بشرية.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
