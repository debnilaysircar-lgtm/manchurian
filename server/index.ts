import express from "express";
import cors from "cors";
// import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

// const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

  // ── STUB (AI call commented out) ──────────────────────────────────────────
  // const prompt = `... (original prompt omitted) ...`;
  // const message = await client.messages.create({
  //   model: "claude-opus-4-7",
  //   max_tokens: 4000,
  //   thinking: { type: "adaptive" },
  //   messages: [{ role: "user", content: prompt }],
  // });
  // const textBlock = message.content.find(b => b.type === "text");
  // const parsed: BestPracticesResponse = JSON.parse(...);
  // res.json(parsed);

  const stub: BestPracticesResponse = {
    implementationApproach: {
      title: `SAP Activate-based implementation for ${productList} — ${project}`,
      phases: [
        { phase: "Prepare", activities: ["Project kick-off & governance setup", "System landscape design", "Activate roadmap confirmation"] },
        { phase: "Explore", activities: ["Fit-to-standard workshops", "Gap analysis & backlog creation", "Data migration strategy"] },
        { phase: "Realize", activities: ["Configuration & development sprints", "Integration build & unit testing", "Data migration dry runs"] },
        { phase: "Deploy", activities: ["User acceptance testing", "Cutover planning & rehearsal", "End-user training delivery"] },
        { phase: "Run", activities: ["Hypercare support", "Performance monitoring", "Handover to AMS"] },
      ],
    },
    criticalSuccessFactors: [
      { factor: "Executive Sponsorship", description: "Active C-level ownership to drive change and resolve escalations." },
      { factor: "Fit-to-Standard Adoption", description: "Minimise custom development by adopting SAP best-practice processes." },
      { factor: "Data Quality", description: "Early data cleanse to ensure clean migration and system integrity." },
      { factor: "Change Management", description: "Structured OCM programme to maximise user adoption at go-live." },
      { factor: "Skilled Team", description: "Retain certified product consultants throughout the project lifecycle." },
    ],
    riskRegister: [
      { risk: "Scope creep due to stakeholder change requests", impact: "High", probability: "High", mitigation: "Enforce change control board with formal approval process." },
      { risk: "Data migration quality issues", impact: "High", probability: "Medium", mitigation: "Iterative dry runs and automated validation rules." },
      { risk: "Integration failures with legacy systems", impact: "High", probability: "Medium", mitigation: "Early integration testing and dedicated middleware team." },
      { risk: "Low end-user adoption post go-live", impact: "Medium", probability: "Medium", mitigation: "Role-based training and super-user network programme." },
      { risk: "Resource attrition during realization", impact: "Medium", probability: "Low", mitigation: "Knowledge transfer sessions and documentation standards." },
    ],
    integrationBestPractices: [
      "Use SAP Integration Suite as the central middleware for all product integrations.",
      "Adopt pre-built iFlows from SAP Business Accelerator Hub where available.",
      "Implement API-first design with versioned endpoints for all custom interfaces.",
      "Establish an integration governance council to manage changes across product boundaries.",
    ],
    keyRecommendations: [
      `Adopt SAP Activate methodology for ${productList} to benefit from pre-built content.`,
      "Prioritise clean-core architecture — avoid modifications in favour of side-by-side extensions.",
      "Invest in a hypercare period of at least 8 weeks post go-live.",
      "Establish a Centre of Excellence (CoE) to sustain and evolve the solution long-term.",
    ],
  };

  res.json(stub);
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

  const productList = products.join(", ");
  const project = projectName || "SAP Implementation";

  // ── STUB (AI call commented out) ──────────────────────────────────────────
  // const message = await client.messages.create({ ... });
  // const parsed: AutoGenerateResponse = JSON.parse(extractJson(textBlock.text));
  // res.json(parsed);

  const stub: AutoGenerateResponse = {
    scopeItems: [
      `${productList} system configuration and unit testing`,
      "Business process design workshops (fit-to-standard)",
      "Data migration — master data and open items",
      "Integration design and build for connected systems",
      "Role-based security design and authorisations",
      "End-to-end integration testing (SIT & UAT)",
      "Cutover planning and execution support",
      "End-user training material development and delivery",
      "Hypercare support (8 weeks post go-live)",
      "Solution documentation and knowledge transfer",
    ],
    outOfScope: [
      "Legacy system decommissioning and data archival",
      "Third-party application licensing and vendor management",
      "Custom BI/reporting beyond standard SAP Analytics",
      "Infrastructure procurement and cloud hosting",
      "Post-hypercare BAU support (covered by AMS contract)",
    ],
    raciEntries: [
      { activity: "Project Governance & Steering", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "Solution Architecture Design", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "System Configuration", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "Data Migration Execution", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "Integration Build & Testing", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "User Acceptance Testing", responsible: "C", accountable: "A", consulted: "R", informed: "I" },
      { activity: "Change Management & Training", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "Cutover Execution", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
      { activity: "Go-Live Sign-Off", responsible: "C", accountable: "A", consulted: "R", informed: "I" },
      { activity: "Hypercare Support", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
    ],
    dependencies: [
      `${productList} licences procured and activated prior to Realise phase`,
      "SAP BTP tenant provisioned for integration and extensibility services",
      "Network connectivity and firewall rules confirmed for system landscape",
      "Source system data extracts available by start of Realise phase",
      "Client IT team available for infrastructure and basis co-ordination",
      "Business process owners allocated at 50%+ for workshop participation",
      "Third-party system APIs documented and accessible for integration design",
      "Security and compliance requirements confirmed before role design begins",
    ],
    assumptions: [
      "Client will provide dedicated business process owners for each workstream",
      `Standard ${productList} best-practice processes will be adopted where possible`,
      "A single production go-live is planned (no phased geographic rollout)",
      "Legacy system will remain operational in parallel for 4 weeks post go-live",
      "All users will receive role-based training prior to go-live",
      "Client infrastructure team will manage all on-premise server provisioning",
      "Project steering committee will meet fortnightly throughout the project",
      "Change requests will follow the agreed change control board process",
    ],
  };

  res.json(stub);
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

  const productList = products.join(", ");

  // ── STUB (AI call commented out) ──────────────────────────────────────────
  // const message = await client.messages.create({ ... });
  // res.json(parsed);

  const stub = [
    { id: "inc-p1", category: "Incident Management", serviceName: "P1/P2 Critical Incident Response", description: "24×7 triage and resolution for production-down and business-critical incidents.", included: true, tier: "Standard", slaTarget: "< 1 hr response / < 4 hr resolve", deliverable: "Incident closure report", frequency: "On-demand" },
    { id: "inc-p3", category: "Incident Management", serviceName: "P3/P4 Standard Incident Management", description: "Business-hours support for medium and low priority incidents.", included: true, tier: "Standard", slaTarget: "< 4 hr response / < 2 day resolve", deliverable: "Incident ticket closure", frequency: "On-demand" },
    { id: "chg-std", category: "Change Management", serviceName: "Standard Change Deployment", description: `Controlled deployment of tested changes to ${productList} production systems.`, included: true, tier: "Standard", slaTarget: "5-day lead time", deliverable: "Change record & release notes", frequency: "Weekly" },
    { id: "chg-emg", category: "Change Management", serviceName: "Emergency Change Facilitation", description: "Fast-track approval and deployment of urgent production fixes.", included: true, tier: "Enhanced", slaTarget: "< 4 hr turnaround", deliverable: "Emergency change report", frequency: "On-demand" },
    { id: "prb-mgmt", category: "Problem Management", serviceName: "Root Cause Analysis & Problem Resolution", description: "Proactive investigation of recurring incidents to eliminate root causes.", included: true, tier: "Enhanced", slaTarget: "RCA within 5 business days", deliverable: "Problem record with RCA", frequency: "On-demand" },
    { id: "rel-mgmt", category: "Release Management", serviceName: "SAP Transport & Release Coordination", description: "End-to-end management of SAP transport requests across landscapes.", included: true, tier: "Standard", slaTarget: "Scheduled release windows", deliverable: "Release manifest", frequency: "Monthly" },
    { id: "mon-sys", category: "Monitoring & Alerting", serviceName: "System Health Monitoring", description: `Continuous monitoring of ${productList} system availability and performance KPIs.`, included: true, tier: "Standard", slaTarget: "99.5% uptime target", deliverable: "Monthly health dashboard", frequency: "Daily" },
    { id: "mon-job", category: "Monitoring & Alerting", serviceName: "Batch Job Monitoring & Recovery", description: "Automated monitoring of scheduled jobs with proactive failure recovery.", included: true, tier: "Standard", slaTarget: "Alert within 15 min of failure", deliverable: "Job failure report", frequency: "Daily" },
    { id: "perf-tune", category: "Performance Management", serviceName: "Performance Tuning & Optimisation", description: "Periodic analysis and optimisation of system and database performance.", included: true, tier: "Enhanced", slaTarget: "Quarterly review cycle", deliverable: "Performance optimisation report", frequency: "Quarterly" },
    { id: "sec-audit", category: "Security & Compliance", serviceName: "Security Patch Management", description: "Assessment and application of SAP security patches and notes.", included: true, tier: "Standard", slaTarget: "Critical patches within 30 days", deliverable: "Patch compliance report", frequency: "Monthly" },
    { id: "sec-role", category: "Security & Compliance", serviceName: "Role & Authorisation Management", description: "Design, maintain and audit SAP roles and user access controls.", included: true, tier: "Standard", slaTarget: "Access provisioned within 2 days", deliverable: "Access audit log", frequency: "On-demand" },
    { id: "usr-admin", category: "User Administration", serviceName: "User Provisioning & Deprovisioning", description: "Lifecycle management of SAP user accounts aligned to HR events.", included: true, tier: "Standard", slaTarget: "< 1 business day", deliverable: "User change confirmation", frequency: "On-demand" },
    { id: "data-arch", category: "Data Management", serviceName: "Data Archiving & Retention", description: "Periodic archiving of aged transactional data to maintain system performance.", included: true, tier: "Enhanced", slaTarget: "Annual archiving cycle", deliverable: "Archiving run report", frequency: "Quarterly" },
    { id: "rep-std", category: "Reporting & Analytics", serviceName: "Standard Report Support & Maintenance", description: `Maintain and enhance standard ${productList} reports and queries.`, included: true, tier: "Standard", slaTarget: "Change within 5 business days", deliverable: "Updated report specification", frequency: "On-demand" },
    { id: "int-sup", category: "Integration Support", serviceName: "Integration Interface Monitoring & Support", description: "Monitor and resolve failures across all inbound and outbound interfaces.", included: true, tier: "Enhanced", slaTarget: "Alert within 30 min of failure", deliverable: "Interface failure log", frequency: "Daily" },
    { id: "trn-know", category: "Training & Knowledge Transfer", serviceName: "Super-User Enablement & Knowledge Base", description: "Maintain training materials and support super-user network.", included: true, tier: "Standard", slaTarget: "Materials updated within 10 days", deliverable: "Updated training content", frequency: "Quarterly" },
    { id: "ci-review", category: "Continuous Improvement", serviceName: "Service Review & Continuous Improvement", description: "Monthly service review with KPI reporting and improvement backlog management.", included: true, tier: "Premium", slaTarget: "Monthly governance meeting", deliverable: "Service review pack", frequency: "Monthly" },
    { id: "ci-road", category: "Continuous Improvement", serviceName: "SAP Roadmap & Innovation Advisory", description: `Quarterly advisory on SAP product updates and new capabilities for ${productList}.`, included: true, tier: "Premium", slaTarget: "Quarterly innovation briefing", deliverable: "Innovation briefing deck", frequency: "Quarterly" },
  ];

  res.json(stub);
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

  const productList = products.join(", ");

  // ── STUB (AI call commented out) ──────────────────────────────────────────
  // const message = await client.messages.create({ ... });
  // res.json(parsed);

  function allocs(percents: number[]) {
    return phaseList.map((phase, i) => ({ phase, percent: percents[i] ?? 0 }));
  }

  const stub = [
    { role: "Project Manager", workstream: "PMO", type: "Both",        allocations: allocs([100, 100, 100, 100, 100, 100]) },
    { role: "Solution Architect", workstream: "Architecture", type: "Consultant", allocations: allocs([80, 100, 100, 60,  40,  20]) },
    { role: "SAP Basis Administrator", workstream: "Technical", type: "Consultant", allocations: allocs([100, 60, 80, 60, 100, 60]) },
    { role: "Change Management Lead", workstream: "OCM", type: "Client", allocations: allocs([60, 80, 80, 100, 100, 80]) },
    { role: "Testing / QA Lead", workstream: "Testing", type: "Consultant", allocations: allocs([20, 40, 60, 100, 80, 40]) },
    { role: "Data Migration Lead", workstream: "Data", type: "Consultant", allocations: allocs([60, 80, 100, 60, 100, 40]) },
    { role: `${products[0] || "SAP"} Lead Functional Consultant`, workstream: products[0] || "Functional", type: "Consultant", allocations: allocs([40, 100, 100, 80, 60, 40]) },
    { role: `${products[0] || "SAP"} Functional Consultant`, workstream: products[0] || "Functional", type: "Consultant", allocations: allocs([20, 80, 100, 80, 40, 20]) },
    ...(products.length > 1 ? [
      { role: `${products[1]} Lead Functional Consultant`, workstream: products[1], type: "Consultant" as const, allocations: allocs([40, 100, 100, 80, 60, 40]) },
      { role: `${products[1]} Functional Consultant`, workstream: products[1], type: "Consultant" as const, allocations: allocs([20, 80, 100, 80, 40, 20]) },
    ] : []),
    ...(products.length > 2 ? [
      { role: `${products[2]} Functional Consultant`, workstream: products[2], type: "Consultant" as const, allocations: allocs([20, 80, 100, 80, 40, 20]) },
    ] : []),
    { role: "ABAP / Integration Developer", workstream: "Technical", type: "Consultant", allocations: allocs([20, 40, 100, 60, 40, 20]) },
    { role: "Client Business Process Owner", workstream: "Business", type: "Client", allocations: allocs([40, 100, 60, 100, 80, 60]) },
    { role: "Client IT Lead", workstream: "Technical", type: "Client", allocations: allocs([80, 60, 60, 60, 100, 60]) },
  ];

  res.json(stub);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Best-practices API running on http://localhost:${PORT}`);
});
