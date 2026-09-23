import assert from "node:assert/strict";
import test from "node:test";
import {
  localVerify,
  normalizeProviderResult,
} from "../src/lib/verification.ts";
import { retrieveEvidence } from "../src/lib/evidence.ts";

test("a fake Bukhari attribution is never treated as verified", () => {
  const result = localVerify("روى البخاري أن شرب القهوة بعد الفجر واجب");
  assert.equal(result.status, "needs_review");
  assert.equal(result.confidence, 0);
  assert.deepEqual(result.sourceIds, []);
  assert.match(result.summary, /لم تُجلب مادته|لا يثبت/);
});

test("religiously sensitive generalizations require human review", () => {
  const result = localVerify("كل المسلمين يتصرفون بالطريقة نفسها دائمًا");
  assert.equal(result.status, "needs_review");
  assert.match(result.summary, /تعميم حساس/);
  assert.match(result.humanReviewReason, /جماعة دينية/);
});

test("a contemporary fatwa request is only triaged", () => {
  const result = localVerify("ما حكم العملات الرقمية في فتوى معاصرة؟");
  assert.equal(result.status, "needs_review");
  assert.equal(result.evidenceLevel, "غير كافٍ");
  assert.deepEqual(result.sourceIds, []);
});

test("source names do not become claim-specific sources", () => {
  const result = localVerify("هذا مذكور في القرآن وصحيح مسلم بلا رقم محدد");
  assert.equal(result.status, "needs_review");
  assert.deepEqual(result.sourceIds, []);
  assert.match(result.sourceNotes.join(" "), /لم تُسترجع نصوص/);
});

test("model-supported output is conservatively demoted and unmeasured", () => {
  const result = normalizeProviderResult({
    status: "supported",
    confidence: 99,
    evidenceLevel: "مرتفع",
    summary: "المطالبة صحيحة بحسب صحيح البخاري.",
    sourceIds: ["bukhari"],
    sourceNotes: ["ورد في البخاري."],
  });
  assert.equal(result.status, "needs_review");
  assert.equal(result.confidence, 0);
  assert.equal(result.evidenceLevel, "غير كافٍ");
  assert.deepEqual(result.sourceIds, []);
  assert.match(result.summary, /ملخص أولي من النموذج/);
  assert.match(result.summary, /لم تُسترجع نصوص/);
  assert.match(result.humanReviewReason, /خُفّضت/);
});

test("provider summaries remain visible but explicitly preliminary", () => {
  const result = normalizeProviderResult({
    status: "needs_review",
    summary: "قد تكون المسألة محل خلاف.",
  });
  assert.match(result.summary, /ملخص أولي من النموذج: قد تكون المسألة محل خلاف/);
  assert.match(result.modeNote, /للفرز الأولي فقط/);
});

test("retrieval returns bounded, claim-specific evidence", () => {
  const evidence = retrieveEvidence("ورد في صحيح البخاري أن الأعمال بالنيات.");
  assert.equal(evidence[0]?.id, "bukhari-hadith-1");
  assert.ok((evidence[0]?.score ?? 0) <= 1);
  assert.ok(evidence[0]?.reference.includes("حديث 1"));
  assert.ok(evidence[0]?.url.startsWith("https://"));
});

test("provider cannot cite evidence that was not retrieved", () => {
  const evidence = retrieveEvidence("إنما الأعمال بالنيات");
  const result = normalizeProviderResult(
    {
      status: "supported",
      confidence: 90,
      evidenceLevel: "مرتفع",
      sourceIds: ["made-up-evidence-id", "bukhari-hadith-1"],
    },
    evidence,
  );
  assert.deepEqual(result.sourceIds, ["bukhari"]);
  assert.deepEqual(result.evidence.map((item) => item.id), ["bukhari-hadith-1"]);
});