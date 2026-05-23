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

// Roles grouped by AMS domain — used when capabilities are selected
export const AMS_DOMAIN_RESOURCES: Record<"basis" | "security" | "solman", ResourceEntry[]> = {
  basis: [
    r("SAP Basis Lead",              "SAP Basis",    "architect"),
    r("SAP Basis Administrator",     "SAP Basis",    "basis"),
    r("HANA DB Administrator",       "SAP Basis",    "basis"),
  ],
  security: [
    r("SAP Security Lead",           "SAP Security", "architect"),
    r("SAP Security / GRC Consultant","SAP Security","security"),
    r("SAP Authorization Specialist","SAP Security", "security"),
  ],
  solman: [
    r("Cloud ALM / SolMan Lead",     "Cloud ALM",    "architect"),
    r("SAP Solution Manager Admin",  "Cloud ALM",    "basis"),
    r("Cloud ALM Consultant",        "Cloud ALM",    "functional"),
  ],
};

// Management roles always present
const MGMT_RESOURCES: ResourceEntry[] = [
  r("AMS Engagement Manager",        "Management",   "pm", "Both"),
  r("AMS Service Delivery Manager",  "Management",   "pm", "Client"),
];

/**
 * Generates AMS resource rows driven by which capability domains are selected.
 * - capsByDomain: { hasBasis, hasSecurity, hasSolMan } from selectedCapabilities
 * - Falls back to all three domains when no capabilities have been selected
 * - productIds is kept for API compatibility but is not used
 */
export function generateResourcesFromProducts(
  _productIds: string[],
  capsByDomain: { hasBasis: boolean; hasSecurity: boolean; hasSolMan: boolean } = {
    hasBasis: true, hasSecurity: true, hasSolMan: true,
  }
): ResourceEntry[] {
  const rows: ResourceEntry[] = [];

  const anySelected = capsByDomain.hasBasis || capsByDomain.hasSecurity || capsByDomain.hasSolMan;
  const showAll = !anySelected;

  if (showAll || capsByDomain.hasBasis)    AMS_DOMAIN_RESOURCES.basis.forEach(e => rows.push({ ...e, allocations: [...e.allocations] }));
  if (showAll || capsByDomain.hasSecurity) AMS_DOMAIN_RESOURCES.security.forEach(e => rows.push({ ...e, allocations: [...e.allocations] }));
  if (showAll || capsByDomain.hasSolMan)   AMS_DOMAIN_RESOURCES.solman.forEach(e => rows.push({ ...e, allocations: [...e.allocations] }));

  MGMT_RESOURCES.forEach(e => rows.push({ ...e, allocations: [...e.allocations] }));
  return rows;
}

export const PHASE_LABELS = PHASES;
