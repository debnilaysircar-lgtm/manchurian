import express from "express";
import cors from "cors";
import path from "path";
import {
  CORE_PHASES, CORE_CSFS, CORE_RISKS, CORE_RACI,
  CORE_OUT_OF_SCOPE, CORE_ASSUMPTIONS, CORE_DEPENDENCIES, CORE_SERVICES,
  getProductData, nameToId,
  type Phase, type CSF, type Risk, type RACIRow, type ServiceEntry,
} from "./data/productDb";
import { generateResourcesFromProducts } from "../src/data/resourceMapping";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveIds(productNames: string[]): string[] {
  return productNames.map(nameToId);
}

function mergeUnique<T>(arrays: T[][], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const arr of arrays) {
    for (const item of arr) {
      const k = key(item);
      if (!seen.has(k)) { seen.add(k); result.push(item); }
    }
  }
  return result;
}

function mergeStrings(arrays: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const arr of arrays) {
    for (const s of arr) {
      if (!seen.has(s)) { seen.add(s); result.push(s); }
    }
  }
  return result;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BestPracticesResponse {
  implementationApproach: { title: string; phases: Phase[] };
  criticalSuccessFactors: CSF[];
  riskRegister: Risk[];
  integrationBestPractices: string[];
  keyRecommendations: string[];
}

export interface AutoGenerateResponse {
  scopeItems: string[];
  outOfScope: string[];
  raciEntries: RACIRow[];
  dependencies: string[];
  assumptions: string[];
}

// ─── /api/best-practices ─────────────────────────────────────────────────────

app.post("/api/best-practices", (req, res) => {
  const { products = [], projectName } = req.body as { products: string[]; projectName?: string };
  if (!products.length) return res.status(400).json({ error: "products array is required" });

  const ids = resolveIds(products);
  const project = projectName || "SAP Implementation";

  // Build phases by merging product-specific activities into core phases
  const phases: Phase[] = CORE_PHASES.map(corePhase => {
    const extra: string[] = [];
    for (const id of ids) {
      const pd = getProductData(id);
      const acts = pd.extraPhaseActivities?.[corePhase.phase] ?? [];
      for (const a of acts) if (!extra.includes(a)) extra.push(a);
    }
    return { phase: corePhase.phase, activities: [...corePhase.activities, ...extra] };
  });

  // Merge CSFs
  const productCSFs = ids.flatMap(id => getProductData(id).csfs ?? []);
  const csfs = mergeUnique([CORE_CSFS, productCSFs], c => c.factor).slice(0, 7);

  // Merge risks
  const productRisks = ids.flatMap(id => getProductData(id).risks ?? []);
  const risks = mergeUnique([CORE_RISKS, productRisks], r => r.risk).slice(0, 7);

  // Integration practices
  const productPractices = ids.flatMap(id => getProductData(id).integrationPractices ?? []);
  const integrationBestPractices = mergeStrings([productPractices]).slice(0, 6).length
    ? mergeStrings([productPractices]).slice(0, 6)
    : ["Use SAP Integration Suite as the standard middleware for all integrations.", "Follow SAP API-first design principles for all custom interfaces."];

  // Recommendations
  const productRecs = ids.flatMap(id => getProductData(id).recommendations ?? []);
  const keyRecommendations = mergeStrings([productRecs]).slice(0, 5).length
    ? mergeStrings([productRecs]).slice(0, 5)
    : ["Follow SAP Activate methodology and leverage pre-built Best Practice content.", "Invest in a hypercare period of at least 8 weeks post go-live."];

  const response: BestPracticesResponse = {
    implementationApproach: {
      title: `SAP Activate-based implementation for ${products.join(", ")} — ${project}`,
      phases,
    },
    criticalSuccessFactors: csfs,
    riskRegister: risks,
    integrationBestPractices,
    keyRecommendations,
  };

  res.json(response);
});

// ─── /api/auto-generate ──────────────────────────────────────────────────────

app.post("/api/auto-generate", (req, res) => {
  const { products = [], projectName } = req.body as { products: string[]; projectName?: string };
  if (!products.length) return res.status(400).json({ error: "products array is required" });

  const ids = resolveIds(products);

  // Scope items: product-specific first, then pad if needed
  const productScope = ids.flatMap(id => getProductData(id).scopeItems ?? []);
  const fallbackScope = [
    `${products.join(" & ")} system configuration and unit testing`,
    "Business process design workshops (fit-to-standard)",
    "Data migration — master data and open items",
    "Integration design and build for connected systems",
    "Role-based security design and authorisations",
    "End-to-end SIT and UAT",
    "Cutover planning and execution",
    "End-user training material development and delivery",
    "Hypercare support (8 weeks post go-live)",
    "Solution documentation and knowledge transfer",
  ];
  const scopeItems = mergeStrings([productScope, fallbackScope]).slice(0, 10);

  // Dependencies
  const productDeps = ids.flatMap(id => getProductData(id).dependencies ?? []);
  const dependencies = mergeStrings([productDeps, CORE_DEPENDENCIES]).slice(0, 10);

  // Assumptions
  const productAssumptions = ids.flatMap(id => getProductData(id).assumptions ?? []);
  const assumptions = mergeStrings([productAssumptions, CORE_ASSUMPTIONS]).slice(0, 10);

  // RACI
  const productRaci = ids.flatMap(id => getProductData(id).raciRows ?? []);
  const raciEntries = mergeUnique([productRaci, CORE_RACI], r => r.activity).slice(0, 10);

  res.json({
    scopeItems,
    outOfScope: CORE_OUT_OF_SCOPE,
    raciEntries,
    dependencies,
    assumptions,
  } satisfies AutoGenerateResponse);
});

// ─── /api/service-catalog ────────────────────────────────────────────────────

app.post("/api/service-catalog", (req, res) => {
  const { products = [] } = req.body as { products: string[]; projectName?: string };
  if (!products.length) return res.status(400).json({ error: "products array is required" });

  const ids = resolveIds(products);

  // Core services always included, product-specific services appended
  const productServices = ids.flatMap(id => getProductData(id).services ?? []);
  const all: ServiceEntry[] = mergeUnique([CORE_SERVICES, productServices], s => s.id);

  res.json(all);
});

// ─── /api/auto-resources ─────────────────────────────────────────────────────

app.post("/api/auto-resources", (req, res) => {
  const { products = [], phases } = req.body as { products: string[]; projectName?: string; phases?: string[] };
  if (!products.length) return res.status(400).json({ error: "products array is required" });

  const phaseList: string[] = (phases && phases.length > 0)
    ? phases
    : ["Prep", "Blueprint", "Realization", "Testing", "Cutover", "Hypercare"];

  const ids = resolveIds(products);
  const entries = generateResourcesFromProducts(ids);

  // Re-map phase labels to match the requested phase list
  const CANONICAL = ["Prep", "Blueprint", "Realization", "Testing", "Cutover", "Hypercare"];
  const result = entries.map(entry => ({
    ...entry,
    allocations: phaseList.map((phase, i) => {
      const canonicalIdx = CANONICAL.indexOf(phase);
      const percent = canonicalIdx >= 0
        ? (entry.allocations[canonicalIdx]?.percent ?? entry.allocations[i]?.percent ?? 0)
        : (entry.allocations[i]?.percent ?? 0);
      return { phase, percent };
    }),
  }));

  res.json(result);
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ─── Static frontend (production only) ───────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SAP Slide Generator running on http://localhost:${PORT}`);
});
