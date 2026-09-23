import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  localVerify,
  normalizeProviderResult,
} from "../lib/verification";

type VerifyBody = {
  claim?: unknown;
  context?: unknown;
  language?: unknown;
};

const sourceCatalog = [
  {
    id: "quran",
    title: "مصحف المدينة النبوية",
    type: "نص قرآني",
    coverage: "القرآن كاملًا",
  },
  {
    id: "bukhari",
    title: "صحيح البخاري",
    type: "حديث",
    coverage: "كتاب الجامع الصحيح",
  },
  {
    id: "muslim",
    title: "صحيح مسلم",
    type: "حديث",
    coverage: "كتاب الصحيح",
  },
  {
    id: "altafsir",
    title: "موسوعة التفسير بالمأثور",
    type: "تفسير",
    coverage: "السور والآيات",
  },
  {
    id: "bin-baz",
    title: "مجموع فتاوى ابن باز",
    type: "فتوى",
    coverage: "العبادات والمعاملات",
  },
  {
    id: "fiqh-academy",
    title: "قرارات مجمع الفقه الإسلامي",
    type: "قرار فقهي",
    coverage: "قضايا معاصرة مختارة",
  },
];

const router: IRouter = Router();

const allowedContexts = new Set([
  "محتوى دعوي",
  "مادة تربوية",
  "سؤال معاصر",
  "منشور اجتماعي",
  "بحث أكاديمي",
]);
const allowedLanguages = new Set(["العربية", "English", "Français"]);
const MAX_CLAIM_LENGTH = 4_000;
const PROVIDER_TIMEOUT_MS = 12_000;

router.get("/verify/status", (_req, res) => {
  res.json({
    service: "preliminary_triage",
    providerConfigured: Boolean(process.env.OPENAI_API_KEY),
    providerConnection: "not_checked",
    sourceRetrievalConnected: false,
    canScientificallyVerify: false,
  });
});

router.post("/verify", async (req, res): Promise<void> => {
  if (
    typeof req.body !== "object" ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    res.status(400).json({ error: "يجب إرسال جسم JSON صالح على هيئة كائن." });
    return;
  }
  const body = req.body as VerifyBody;
  const claim = typeof body.claim === "string" ? body.claim.trim() : "";
  const context = body.context === undefined ? "محتوى دعوي" : body.context;
  const language = body.language === undefined ? "العربية" : body.language;

  if (claim.length < 8) {
    res.status(400).json({ error: "يجب أن تحتوي المطالبة على ثمانية أحرف على الأقل." });
    return;
  }
  if (claim.length > MAX_CLAIM_LENGTH) {
    res.status(413).json({ error: "المطالبة طويلة جدًا؛ الحد الأقصى 4000 حرف." });
    return;
  }
  if (typeof context !== "string" || !allowedContexts.has(context)) {
    res.status(400).json({ error: "قيمة السياق غير مدعومة." });
    return;
  }
  if (typeof language !== "string" || !allowedLanguages.has(language)) {
    res.status(400).json({ error: "قيمة اللغة غير مدعومة." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    logger.warn("OPENAI_API_KEY is not configured; using transparent local analysis");
    res.json(localVerify(claim));
    return;
  }

  const systemPrompt = [
    "أنت محرك فرز وتحقق أولي لمحتوى إسلامي. لا تصدر فتوى ولا تنسب حكمًا شرعيًا من عندك.",
    "هذا فرز أولي فقط؛ فهرس المصادر ليس نصوصًا مسترجعة ولا يثبت أي ادعاء.",
    "لا تختر supported مطلقًا لأنك لا تملك مقاطع خاصة بالمطالبة. اختر insufficient أو needs_review.",
    "اختر needs_review للمسائل الفقهية أو المعاصرة أو الحساسة، حتى لو وجدت إشارة جزئية.",
    "لا تستنتج تدين الشخص أو مذهبه أو أي سمة دينية حساسة.",
    "أعد JSON صالحًا فقط بالمفاتيح: status, confidence, evidenceLevel, summary, recommendedAction, humanReviewReason, sourceIds, sourceNotes.",
    'status يجب أن يكون supported أو needs_review أو insufficient.',
    "confidence رقم صحيح من 0 إلى 100. evidenceLevel إحدى: مرتفع، جزئي، غير كافٍ.",
    "sourceIds يجب أن تكون من معرفات الفهرس المرفق فقط. لا تخترع مراجع أو أرقام صفحات أو روابط.",
    "لا تعتبر اسم كتاب أو معرف مصدر إحالة مثبتة، ولا تدّع مطابقة نص لم يُسترجع.",
    "اكتب الملخص والتوصية وسبب الإحالة بالعربية الواضحة حتى لو كانت لغة المطالبة مختلفة.",
  ].join("\n");

  const userPrompt = JSON.stringify({
    claim,
    context,
    language,
    sourceCatalog,
  });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        max_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        req.log.warn({ status: response.status }, "OpenAI credentials rejected; using transparent local analysis");
        res.json(localVerify(claim));
        return;
      }
      req.log.error({ status: response.status }, "OpenAI verification request failed");
      res.status(502).json({ error: "تعذر إكمال التحليل من مزود الذكاء الاصطناعي." });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "لم تُرجع خدمة التحليل نتيجة قابلة للقراءة." });
      return;
    }

    res.json(normalizeProviderResult(JSON.parse(content)));
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    req.log.error({ reason: timedOut ? "timeout" : "invalid_provider_response" }, "Verification analysis failed");
    res
      .status(timedOut ? 504 : 502)
      .json({ error: timedOut ? "انتهت مهلة خدمة التحليل." : "تعذر تحليل المطالبة حاليًا. حاولي مرة أخرى." });
  }
});

export default router;