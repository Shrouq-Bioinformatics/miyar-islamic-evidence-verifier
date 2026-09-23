import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, workspaceCases } from "@workspace/db";
import { caseStatusSchema } from "@workspace/db/schema";

const router: IRouter = Router();
const workspaceId = "default";

function serializeCase(item: typeof workspaceCases.$inferSelect) {
  return {
    id: item.id,
    claim: item.claim,
    context: item.context,
    language: item.language,
    status: item.status,
    confidence: item.confidence,
    evidenceLevel: item.evidenceLevel,
    summary: item.summary ?? undefined,
    recommendedAction: item.recommendedAction ?? undefined,
    reviewerNote: item.reviewerNote ?? undefined,
    sources: item.sourceIds,
    sourceNotes: item.sourceNotes,
    evidence: item.evidence,
    analysisMode: item.analysisMode,
    modeNote: item.modeNote,
    createdAt: item.createdAt.toISOString(),
    reviewedAt: item.reviewedAt?.toISOString(),
    reviewedBy: item.reviewedBy ?? undefined,
    isSample: false,
  };
}

router.get("/cases", async (_req, res) => {
  const rows = await db
    .select()
    .from(workspaceCases)
    .where(eq(workspaceCases.workspaceId, workspaceId))
    .orderBy(desc(workspaceCases.createdAt));
  res.json({ cases: rows.map(serializeCase) });
});

router.post("/cases", async (req, res) => {
  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "بيانات الحالة غير صالحة." });
    return;
  }
  const claim = typeof body.claim === "string" ? body.claim.trim() : "";
  const status = caseStatusSchema.safeParse(body.status);
  if (!claim || !status.success || typeof body.context !== "string" || typeof body.language !== "string") {
    res.status(400).json({ error: "يلزم إرسال المطالبة والسياق واللغة والحالة." });
    return;
  }
  const id = crypto.randomUUID();
  const row = await db.insert(workspaceCases).values({
    id,
    claim,
    context: body.context,
    language: body.language,
    status: status.data,
    confidence: typeof body.confidence === "number" ? Math.max(0, Math.min(100, Math.round(body.confidence))) : 0,
    evidenceLevel: typeof body.evidenceLevel === "string" ? body.evidenceLevel : "غير كافٍ",
    summary: typeof body.summary === "string" ? body.summary : null,
    recommendedAction: typeof body.recommendedAction === "string" ? body.recommendedAction : null,
    reviewerNote: typeof body.reviewerNote === "string" ? body.reviewerNote : null,
    sourceIds: Array.isArray(body.sources) ? body.sources.filter((item): item is string => typeof item === "string") : [],
    sourceNotes: Array.isArray(body.sourceNotes) ? body.sourceNotes.filter((item): item is string => typeof item === "string") : [],
    evidence: Array.isArray(body.evidence) ? body.evidence : [],
    analysisMode: body.analysisMode === "ai" ? "ai" : "local",
    modeNote: typeof body.modeNote === "string" ? body.modeNote : "حالة محفوظة للمراجعة ضمن مساحة الفريق.",
    workspaceId,
  }).returning();
  res.status(201).json(serializeCase(row[0]));
});

router.patch("/cases/:id/decision", async (req, res) => {
  const status = caseStatusSchema.safeParse((req.body as { status?: unknown })?.status);
  if (!status.success) {
    res.status(400).json({ error: "قرار المراجعة غير مدعوم." });
    return;
  }
  const reviewerNote = status.data === "supported"
    ? "قرار مراجعة بشرية مسجل في مساحة الفريق؛ لا يمثل فتوى أو اعتمادًا مؤسسيًا."
    : "أوقفت المراجعة الاعتماد لعدم كفاية الدليل.";
  const rows = await db.update(workspaceCases).set({
    status: status.data,
    reviewerNote,
    reviewedAt: new Date(),
    reviewedBy: "مراجع مساحة الفريق",
  }).where(and(eq(workspaceCases.id, req.params.id), eq(workspaceCases.workspaceId, workspaceId))).returning();
  if (!rows[0]) {
    res.status(404).json({ error: "لم نعثر على الحالة في مساحة الفريق." });
    return;
  }
  res.json(serializeCase(rows[0]));
});

export default router;