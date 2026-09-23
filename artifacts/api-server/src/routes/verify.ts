import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";
import {
  normalizeProviderResult,
} from "../lib/verification";
import { retrieveEvidence } from "../lib/evidence";

type VerifyBody = {
  claim?: unknown;
  context?: unknown;
  language?: unknown;
};

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
    providerConfigured: Boolean(
      process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    ),
    providerConnection: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      ? "replit_managed_openai"
      : "direct_openai",
    sourceRetrievalConnected: true,
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

  const aiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const aiBaseUrl =
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1";
  if (!aiKey) {
    logger.error("OPENAI_API_KEY is not configured; refusing to present local analysis as complete AI");
    res.status(503).json({
      error: "خدمة الذكاء الاصطناعي غير مهيأة. أضيفي مفتاح المزود قبل استخدام المسار الرسمي.",
      code: "AI_NOT_CONFIGURED",
    });
    return;
  }

  const retrievedEvidence = retrieveEvidence(claim);
  const systemPrompt = [
    "أنت محرك فرز وتحقق أولي لمحتوى إسلامي. لا تصدر فتوى ولا تنسب حكمًا شرعيًا من عندك.",
    "هذه المقتطفات هي الأدلة الوحيدة المسموح لك بإسناد النتيجة إليها. لا تخترع نصًا أو مرجعًا أو رابطًا.",
    "اختر supported فقط إذا كانت المطالبة تطابق معنى مقتطف مسترجع مباشرة، مع بقاء المراجعة البشرية مطلوبة.",
    "اختر needs_review للمسائل الفقهية أو المعاصرة أو الحساسة، حتى لو وجدت إشارة جزئية.",
    "لا تستنتج تدين الشخص أو مذهبه أو أي سمة دينية حساسة.",
    "أعد JSON صالحًا فقط بالمفاتيح: status, confidence, evidenceLevel, summary, recommendedAction, humanReviewReason, sourceIds, sourceNotes.",
    'status يجب أن يكون supported أو needs_review أو insufficient.',
    "confidence رقم صحيح من 0 إلى 100. evidenceLevel إحدى: مرتفع، جزئي، غير كافٍ.",
    "sourceIds يجب أن تكون من معرفات المقتطفات المسترجعة فقط. لا تخترع مراجع أو أرقام صفحات أو روابط.",
    "إذا لم توجد مطابقة مباشرة في الأدلة، اختر insufficient أو needs_review ولا تستخدم اسم الكتاب كدليل.",
    "اكتب الملخص والتوصية وسبب الإحالة بالعربية الواضحة حتى لو كانت لغة المطالبة مختلفة.",
  ].join("\n");

  const userPrompt = JSON.stringify({
    claim,
    context,
    language,
    retrievedEvidence,
  });

  try {
    const response = await fetch(`${aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        response_format: { type: "json_object" },
        max_completion_tokens: 900,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const providerError = await response.text();
      if (response.status === 401 || response.status === 403) {
        req.log.error({ status: response.status }, "OpenAI credentials rejected");
        res.status(502).json({ error: "رفض مزود الذكاء الاصطناعي بيانات الاعتماد؛ أصلحي إعداد المفتاح قبل المتابعة." });
        return;
      }
      req.log.error({ status: response.status, providerError: providerError.slice(0, 500) }, "OpenAI verification request failed");
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

    res.json(normalizeProviderResult(JSON.parse(content), retrievedEvidence));
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