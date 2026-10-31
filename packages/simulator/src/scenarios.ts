// packages/simulator — built-in traffic scenario presets (plan.md 5.2).
// A preset is just a multiplier/ramp applied to the app's base target RPS,
// so it works the same way regardless of which diagram it's run against.
export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  targetRpsMultiplier: number;
  rampTicks: number;
}

export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  {
    id: "steady-baseline",
    label: "Steady Baseline",
    description: "Constant traffic at the normal target rate.",
    targetRpsMultiplier: 1,
    rampTicks: 5,
  },
  {
    id: "black-friday-spike",
    label: "Black Friday Spike (10x)",
    description: "Traffic spikes to 10x the baseline rate.",
    targetRpsMultiplier: 10,
    rampTicks: 5,
  },
  {
    id: "gradual-ramp",
    label: "Gradual Ramp",
    description: "Traffic climbs slowly to 3x baseline over many ticks.",
    targetRpsMultiplier: 3,
    rampTicks: 20,
  },
];

export const DEFAULT_SCENARIO_ID: string = SCENARIO_PRESETS[0]?.id ?? "steady-baseline";

export function getScenarioById(id: string): ScenarioPreset | undefined {
  return SCENARIO_PRESETS.find((scenario) => scenario.id === id);
}
