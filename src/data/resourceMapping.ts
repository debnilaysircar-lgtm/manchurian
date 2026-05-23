import type { ResourceEntry } from "../utils/generatePptx";

const PROFILES = {
  pm:         [100, 100, 100, 100, 100, 100],
  architect:  [ 80, 100,  80,  60, 100,  50],
  functional: [ 50, 100, 100,  80,  80,  50],
  basis:      [ 80,  50,  80,  50, 100,  60],
  security:   [ 30,  60,  80,  60,  60,  20],
};

const PHASES = ["Prep", "Blueprint", "Realization", "Testing", "Cutover", "Hypercare"];

function toAllocations(profile: number[]): ResourceEntry["allocations"] {
  return PHASES.map((phase, i) => ({ phase, percent: profile[i] }));
}

function r(
  role: string,
  workstream: string,
  profileKey: keyof typeof PROFILES,
  type: ResourceEntry["type"] = "Consultant"
): ResourceEntry {
  return { role, workstream, type, allocations: toAllocations(PROFILES[profileKey]) };
}

// AMS resource roles — Basis, Security, Cloud ALM only
const AMS_RESOURCES: ResourceEntry[] = [
  // SAP Basis
  r("SAP Basis Lead",                 "SAP Basis",    "architect"),
  r("SAP Basis Administrator",        "SAP Basis",    "basis"),
  r("HANA DB Administrator",          "SAP Basis",    "basis"),

  // SAP Security
  r("SAP Security Lead",              "SAP Security", "architect"),
  r("SAP Security / GRC Consultant",  "SAP Security", "security"),
  r("SAP Authorization Specialist",   "SAP Security", "security"),

  // Cloud ALM / Solution Manager
  r("Cloud ALM / SolMan Lead",        "Cloud ALM",    "architect"),
  r("SAP Solution Manager Admin",     "Cloud ALM",    "basis"),
  r("Cloud ALM Consultant",           "Cloud ALM",    "functional"),

  // AMS Management
  r("AMS Engagement Manager",         "Management",   "pm", "Both"),
  r("AMS Service Delivery Manager",   "Management",   "pm", "Client"),
];

/**
 * Returns the standard AMS resource set (Basis, Security, Cloud ALM).
 * productIds is accepted for API compatibility but AMS roles are fixed.
 */
export function generateResourcesFromProducts(_productIds: string[]): ResourceEntry[] {
  return AMS_RESOURCES.map(e => ({ ...e, allocations: [...e.allocations] }));
}

export const PHASE_LABELS = PHASES;
