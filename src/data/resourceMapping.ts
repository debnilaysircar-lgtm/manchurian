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

export type DomainIntensity = 0.5 | 1 | 1.5 | 2;

export interface ResourceIntensities {
  basis:    DomainIntensity;
  security: DomainIntensity;
  solman:   DomainIntensity;
}

export const DEFAULT_INTENSITIES: ResourceIntensities = {
  basis:    1,
  security: 1,
  solman:   1,
};

function applyIntensity(entries: ResourceEntry[], multiplier: number): ResourceEntry[] {
  return entries.map(e => ({
    ...e,
    allocations: e.allocations.map(a => ({
      ...a,
      percent: Math.min(100, Math.round(a.percent * multiplier)),
    })),
  }));
}

/**
 * Generates AMS resource rows driven by which capability domains are selected
 * and optional per-domain intensity multipliers.
 */
export function generateResourcesFromProducts(
  _productIds: string[],
  capsByDomain: { hasBasis: boolean; hasSecurity: boolean; hasSolMan: boolean } = {
    hasBasis: true, hasSecurity: true, hasSolMan: true,
  },
  intensities: ResourceIntensities = DEFAULT_INTENSITIES
): ResourceEntry[] {
  const rows: ResourceEntry[] = [];

  const anySelected = capsByDomain.hasBasis || capsByDomain.hasSecurity || capsByDomain.hasSolMan;
  const showAll = !anySelected;

  if (showAll || capsByDomain.hasBasis)
    applyIntensity(AMS_DOMAIN_RESOURCES.basis, intensities.basis).forEach(e => rows.push(e));
  if (showAll || capsByDomain.hasSecurity)
    applyIntensity(AMS_DOMAIN_RESOURCES.security, intensities.security).forEach(e => rows.push(e));
  if (showAll || capsByDomain.hasSolMan)
    applyIntensity(AMS_DOMAIN_RESOURCES.solman, intensities.solman).forEach(e => rows.push(e));

  MGMT_RESOURCES.forEach(e => rows.push({ ...e, allocations: [...e.allocations] }));
  return rows;
}

export const PHASE_LABELS = PHASES;
