// packages/simulator — the shape of a practice-mode scenario prompt
// (Phase 6). The actual prompt content is static data that lives in the
// app (apps/web/content/prompts.ts) rather than here, since it's product
// copy, not simulation logic; this type is shared so the app and
// @p0rygon/ui agree on its shape. `scenarioId` reuses an existing
// ScenarioPreset instead of duplicating traffic-profile math.
export interface ScenarioPrompt {
  id: string;
  title: string;
  description: string;
  checklist: readonly string[];
  scenarioId: string;
}
