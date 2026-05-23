import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface BestPracticesRequest {
  products: string[];
  projectName?: string;
}

export interface BestPracticesResponse {
  implementationApproach: {
    title: string;
    phases: Array<{ phase: string; activities: string[] }>;
  };
  criticalSuccessFactors: Array<{ factor: string; description: string }>;
  riskRegister: Array<{
    risk: string;
    impact: "High" | "Medium" | "Low";
    probability: "High" | "Medium" | "Low";
    mitigation: string;
  }>;
  integrationBestPractices: string[];
  keyRecommendations: string[];
}

app.post("/api/best-practices", async (req, res) => {
  const { products, projectName } = req.body as BestPracticesRequest;

  if (!products || products.length === 0) {
    return res.status(400).json({ error: "products array is required" });
  }

  const productList = products.join(", ");
  const project = projectName || "SAP Implementation";

  const prompt = `You are a senior SAP implementation consultant with 20+ years of experience.
A client is implementing the following SAP products: ${productList}.
Project name: ${project}

Provide a best-in-class solution plan in strict JSON format (no markdown, no code fences, just raw JSON).
The JSON must match this exact structure:

{
  "implementationApproach": {
    "title": "string describing the overall approach",
    "phases": [
      { "phase": "phase name", "activities": ["activity1", "activity2", "activity3"] }
    ]
  },
  "criticalSuccessFactors": [
    { "factor": "short factor name", "description": "one sentence explanation" }
  ],
  "riskRegister": [
    {
      "risk": "risk description",
      "impact": "High|Medium|Low",
      "probability": "High|Medium|Low",
      "mitigation": "mitigation strategy"
    }
  ],
  "integrationBestPractices": ["best practice 1", "best practice 2"],
  "keyRecommendations": ["recommendation 1", "recommendation 2"]
}

Guidelines:
- implementationApproach.phases: include 5-6 phases (Prepare, Explore, Realize, Deploy, Run + any product-specific phases), each with 3-5 activities specific to the selected products
- criticalSuccessFactors: 5-7 factors specific to this product combination
- riskRegister: 5-7 risks specific to these products with realistic mitigations
- integrationBestPractices: 4-6 best practices for integrating these products together
- keyRecommendations: 4-5 concise strategic recommendations
- Be specific to the selected products — not generic SAP advice
- Base on SAP Activate methodology and current best practices

Return only raw JSON, nothing else.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "No text response from AI" });
    }

    const raw = textBlock.text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;

    const parsed: BestPracticesResponse = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ── /api/auto-generate ─────────────────────────────────────────────────────
interface AutoGenerateRequest {
  products: string[];
  projectName?: string;
  clientContext?: string;
  tone?: "strategic" | "technical" | "concise";
}

export interface AutoGenerateResponse {
  scopeItems: string[];
  outOfScope: string[];
  raciEntries: Array<{
    activity: string;
    responsible: string;
    accountable: string;
    consulted: string;
    informed: string;
  }>;
  dependencies: string[];
  assumptions: string[];
}

function extractJson(raw: string): string {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 ? raw.slice(start, end + 1) : raw;
}

app.post("/api/auto-generate", async (req, res) => {
  const { products, projectName, clientContext, tone } = req.body as AutoGenerateRequest;

  if (!products || products.length === 0) {
    return res.status(400).json({ error: "products array is required" });
  }

  const toneGuide =
    tone === "technical"  ? "Use precise, technical implementation language."
    : tone === "concise"  ? "Be very brief. Short bullet-point style sentences."
    : "Use professional, business-outcome focused language suitable for executive review.";

  const context = clientContext?.trim()
    ? `\n\nAdditional client context provided:\n${clientContext}`
    : "";

  const prompt = `You are a senior SAP implementation consultant.
Project: ${projectName || "SAP Implementation"}
SAP Products in scope: ${products.join(", ")}${context}

${toneGuide}

Generate project content in strict JSON format. Return ONLY raw JSON, no markdown, no code fences.

{
  "scopeItems": [
    "8 to 10 specific in-scope deliverables tailored to the SAP products listed"
  ],
  "outOfScope": [
    "5 to 6 realistic out-of-scope items for this implementation"
  ],
  "raciEntries": [
    {
      "activity": "activity or deliverable name",
      "responsible": "R",
      "accountable": "A",
      "consulted": "C",
      "informed": "I"
    }
  ],
  "dependencies": [
    "8 to 10 specific project and technical dependencies for these products"
  ],
  "assumptions": [
    "8 to 10 realistic project assumptions for this SAP implementation"
  ]
}

Rules:
- scopeItems: 8–10 items, product-specific (mention the actual SAP modules)
- outOfScope: 5–6 items
- raciEntries: 8–10 rows covering governance, configuration, data migration, testing, training, go-live, hypercare
- Each RACI cell must be a single letter: R, A, C, or I
- dependencies: 8–10 items referencing the specific products
- assumptions: 8–10 items
- ALL content must be tailored to the selected SAP products, not generic boilerplate
- Return ONLY raw JSON`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "No text response from AI" });
    }

    const parsed: AutoGenerateResponse = JSON.parse(extractJson(textBlock.text));
    res.json(parsed);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ── /api/service-catalog ───────────────────────────────────────────────────
interface ServiceCatalogRequest {
  products: string[];
  projectName?: string;
  clientContext?: string;
}

app.post("/api/service-catalog", async (req, res) => {
  const { products, projectName, clientContext } = req.body as ServiceCatalogRequest;

  if (!products || products.length === 0) {
    return res.status(400).json({ error: "products array is required" });
  }

  const context = clientContext?.trim() ? `\n\nClient context: ${clientContext}` : "";

  const prompt = `You are a senior SAP AMS (Application Management Services) consultant.
Project: ${projectName || "SAP AMS Engagement"}
SAP Products: ${products.join(", ")}${context}

Generate a comprehensive service catalog tailored to these specific SAP products. Return ONLY raw JSON, no markdown.

Return an array of service catalog entries:
[
  {
    "id": "unique-kebab-case-id",
    "category": "one of: Incident Management | Change Management | Problem Management | Release Management | Monitoring & Alerting | Performance Management | Security & Compliance | User Administration | Data Management | Reporting & Analytics | Integration Support | Training & Knowledge Transfer | Continuous Improvement",
    "serviceName": "specific service name referencing the SAP product where relevant",
    "description": "one-sentence description of what this service covers",
    "included": true,
    "tier": "Standard | Enhanced | Premium",
    "slaTarget": "e.g. 99.9% uptime / < 4hr response",
    "deliverable": "tangible output e.g. Monthly health report / Incident ticket closure",
    "frequency": "e.g. On-demand | Daily | Weekly | Monthly | Quarterly"
  }
]

Rules:
- Generate 16–22 entries covering all major AMS service categories
- Each product should have at least 1–2 product-specific services
- Vary tiers: ~50% Standard, ~30% Enhanced, ~20% Premium
- Be specific to the SAP products — mention actual module names (FI, CO, SD, MM, etc.)
- slaTarget must be concise (under 40 chars)
- Return ONLY a JSON array, no wrapper object`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "No text response from AI" });
    }

    const raw = textBlock.text.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const jsonStr = start >= 0 ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ── /api/auto-resources ────────────────────────────────────────────────────
interface AutoResourcesRequest {
  products: string[];
  projectName?: string;
  clientContext?: string;
  phases?: string[];
}

app.post("/api/auto-resources", async (req, res) => {
  const { products, projectName, clientContext, phases } = req.body as AutoResourcesRequest;

  if (!products || products.length === 0) {
    return res.status(400).json({ error: "products array is required" });
  }

  const phaseList = (phases && phases.length > 0)
    ? phases
    : ["Prep", "Blueprint", "Realization", "Testing", "Cutover", "Hypercare"];

  const context = clientContext?.trim() ? `\n\nClient context: ${clientContext}` : "";

  const prompt = `You are a senior SAP staffing and resource planning consultant.

Project: ${projectName || "SAP Implementation"}
SAP Products in scope: ${products.join(", ")}${context}

Project phases (in order): ${phaseList.join(", ")}

Generate a realistic FTE resource plan. Return ONLY raw JSON — no markdown, no code fences.

Return an array of resource entries:
[
  {
    "role": "exact job title (e.g. S/4HANA Finance Lead Consultant)",
    "workstream": "short workstream name (e.g. Finance, Logistics, Technical, HCM)",
    "type": "Consultant | Client | Both",
    "allocations": [
      { "phase": "${phaseList[0]}", "percent": 80 },
      { "phase": "${phaseList[1]}", "percent": 100 },
      ...one entry per phase in the same order as the phases array...
    ]
  }
]

Rules:
- Always include these core roles: Project Manager (Both, 100% all phases), SAP Basis Administrator (Consultant), Change Management Lead (Client), Testing/QA Lead (Consultant), Data Migration Lead (Consultant)
- Add product-specific functional consultants and architects for EACH selected product — at least 1 lead architect and 1–2 functional consultants per product area
- Add integration/technical roles if multiple products are selected
- type "Consultant" = delivery partner staff; "Client" = client-side resources; "Both" = shared/PM roles
- Allocation percents (0–100) must reflect realistic phasing:
  - Architects: peak in Blueprint and Realization
  - Functional consultants: peak in Blueprint and Realization, high in Testing
  - Developers: low in Blueprint, peak in Realization
  - Basis: high in Prep and Cutover
  - Data migration: peak in Realization and Cutover
  - Testing: peak in Testing phase
  - Change management: high throughout, peak at Cutover
  - Client Business Owners: high in Blueprint and Testing
- Include 10–18 roles total depending on the number of products
- Each allocations array must have exactly ${phaseList.length} entries in phase order
- Return ONLY a JSON array`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 5000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "No text response from AI" });
    }

    const raw = textBlock.text.trim();
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    const parsed = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw);
    res.json(parsed);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Best-practices API running on http://localhost:${PORT}`);
});
