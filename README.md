# مِعيار — مدقّق الأدلة الإسلامية

مِعيار مساحة عربية RTL للفرز الأولي للادعاءات الإسلامية قبل النشر. يفصل بين الإشارة إلى مرجع، والدليل المسترجع، والقرار البشري، ويتوقف عند نقص الدليل بدل إنتاج يقين زائف. المشاركة ضمن **المسار الرابع: أدوات المعرفة والتحقق لتمكين المعرّفين بالإسلام**.

> **الحالة الصادقة:** المسار الرسمي يستخدم بوابة OpenAI المُدارة في Replit، ويسترجع مقتطفات من فهرس أدلة منقح قبل التحليل، ويحفظ الحالات والقرارات في PostgreSQL. النتيجة فرز أولي قابل للتتبع وليست فتوى أو قياس دقة علمية؛ المسائل الحساسة تبقى للمراجعة البشرية.

## ما يعمل الآن

- واجهة عربية متجاوبة: لوحة قيادة، تدقيق مطالبة، قائمة مراجعة، مكتبة مصادر، تحليلات، وإعدادات أمان.
- خدمة `POST /api/verify` مع تحقق من المدخلات ومخرجات مقيدة.
- تحليل AI رسمي مع فشل صريح عند تعذر المزود، بدل عرض نتيجة محلية كأنها تحليل AI.
- استرجاع مقتطفات من فهرس أدلة منقح مع المرجع والرابط والطبعة وتاريخ الاسترجاع.
- حفظ الحالات والقرارات في PostgreSQL لمساحة الفريق؛ تُستخدم `localStorage` فقط لتفضيلات العرض المحلية.

## حدود النسخة

- تغطية corpus الحالية محدودة بثلاثة مقتطفات منقحة، ولا تمثل كل القرآن والحديث والفتاوى.
- لا اختبار دقة محكم بمراجعين، ولا مصادقة أو أدوار أو سجل تدقيق غير قابل للتلاعب.
- رابط العرض العام: <https://maayr-islamic-evidence-verifier.replit.app>. النشر ناجح وعام، لكن يجب إعادة نشر آخر تغييرات المشروع قبل التسليم.
- مستودع GitHub العام متاح: https://github.com/Shrouq-Bioinformatics/miyar-islamic-evidence-verifier
- يوجد تصدير سابق للعرض إلى PDF وPowerPoint (16 شريحة). عُزّز مصدر العرض لاحقًا بلقطة التطبيق والنتائج وخطة الاستمرار، لكن `exportSlides` يفشل حاليًا؛ لذلك حُفظ التصديران السابقان دون استبدال ولا يُدّعى أنهما يعكسان آخر تعديلات المصدر. الفيديو النهائي `submission/miyar-demo.mp4` مدته 87 ثانية، بنسبة 16:9، ومرفق معه مسار فيديو وصوت موسيقي.

## المتطلبات

- Node.js 24
- pnpm (استُخدم ملف القفل `pnpm-lock.yaml`)

## التثبيت والفحص والبناء

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
PORT=24752 BASE_PATH=/ pnpm --filter @workspace/miyar-evidence-verifier run build
pnpm --filter @workspace/api-server run build
```

في workspace التطوير الكامل يشمل البناء الجذري جميع artifacts، ومن ضمنها Canvas. أما `miyar-source.zip` فيستبعد Canvas ومحرر العرض عمدًا ويحتفظ بحزم المنتج وتبعيات بنائه فقط؛ لذلك يبني `pnpm run build` الحزم الموجودة في اللقطة. تضبط بيئة Replit قيم الخدمات من ملفات `.replit-artifact/artifact.toml`.

## التشغيل المطابق للإعداد الحالي

المسار المتكامل يعتمد راوتر Replit الذي يجمع الواجهة `/` وواجهة API عند `/api` على أصل واحد. شغّل خدمتي الـartifact من واجهة Replit/Run؛ أو، للتشخيص فقط، في طرفيتين:

```bash
# الطرفية 1 — API
PORT=8080 pnpm --filter @workspace/api-server run dev

# الطرفية 2 — الواجهة
PORT=24752 BASE_PATH=/ pnpm --filter @workspace/miyar-evidence-verifier run dev
```

التشغيل اليدوي على منفذين لا يربط طلب الواجهة النسبي `/api/verify` بالخادم تلقائيًا؛ يلزم reverse proxy بأصل واحد يعيد `/api/*` إلى `localhost:8080`. يحتاج المسار الرسمي إلى `AI_INTEGRATIONS_OPENAI_BASE_URL` و`AI_INTEGRATIONS_OPENAI_API_KEY` المُدارين في Replit. لا تضف سرًا إلى الملفات أو الحزمة.

## وثائق المشاركة

- [`docs/miyar-submission.md`](docs/miyar-submission.md): ملف المشاركة، المنهجية، القيود، التقييم، والجاهزية.
- [`docs/demo-script-90s.md`](docs/demo-script-90s.md): نص تعليق صوتي مدته 90 ثانية بتوقيتات.
- [`docs/evaluation-privacy.md`](docs/evaluation-privacy.md): بروتوكول التقييم والتعامل مع البيانات.
- [`docs/competition-compliance.md`](docs/competition-compliance.md): مطابقة صريحة لشروط المسابقة ومعايير التحكيم.
- [`docs/third-party-licenses.json`](docs/third-party-licenses.json): جرد آلي لتراخيص تبعيات الإنتاج.
- `submission/miyar-participation-brief.html`: موجز عربي ذاتي الاحتواء ومهيأ للطباعة.
- `submission/miyar-participation-brief.pdf`: نسخة PDF مطبوعة من الموجز.
- `submission/miyar-participation-deck.pdf`: تصدير العرض السابق بصيغة PDF (16 شريحة؛ يحتاج إعادة تصدير بعد إصلاح `exportSlides`).
- `submission/miyar-participation-deck.pptx`: تصدير PowerPoint السابق (يحتاج إعادة تصدير بالطريقة القياسية نفسها).
- `submission/miyar-demo.mp4`: فيديو توضيحي أفقي مدته 87 ثانية، بنسبة 16:9.
- `submission/miyar-source.zip`: لقطة مصدر قابلة للبناء وفق قائمة سماح، تتضمن وثيقة مطابقة المسابقة وجرد التراخيص، وتستبعد الأسرار و`node_modules` و`.git` و`attached_assets` وCanvas ومحرر العرض.
- `submission/package-source.sh`: سكربت قائمة السماح لإعادة إنشاء ZIP بعد اكتمال آخر تغييرات الواجهة.

## تنبيه الاستخدام

مِعيار لا يصدر فتوى ولا يمنح إذنًا بالنشر. لا تُدخل بيانات شخصية أو سرية. كل نتيجة حالية نقطة بدء للمراجعة البشرية وليست حكمًا شرعيًا أو توثيقًا نهائيًا.