import { createInsertSchema } from "drizzle-zod";
import { jsonb, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const workspaceCases = pgTable("workspace_cases", {
  id: text("id").primaryKey(),
  claim: text("claim").notNull(),
  context: text("context").notNull(),
  language: text("language").notNull(),
  status: text("status").notNull(),
  confidence: integer("confidence").notNull().default(0),
  evidenceLevel: text("evidence_level").notNull(),
  summary: text("summary"),
  recommendedAction: text("recommended_action"),
  reviewerNote: text("reviewer_note"),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull().default([]),
  sourceNotes: jsonb("source_notes").$type<string[]>().notNull().default([]),
  evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
  analysisMode: text("analysis_mode").notNull(),
  modeNote: text("mode_note").notNull(),
  workspaceId: text("workspace_id").notNull().default("default"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
});

export const insertWorkspaceCaseSchema = createInsertSchema(workspaceCases).omit({
  createdAt: true,
  reviewedAt: true,
  reviewedBy: true,
});

export const caseStatusSchema = z.enum(["supported", "needs_review", "insufficient"]);
export type WorkspaceCase = typeof workspaceCases.$inferSelect;
export type InsertWorkspaceCase = z.infer<typeof insertWorkspaceCaseSchema>;