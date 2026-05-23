/**
 * Static product database — replaces AI calls for all four server endpoints.
 * Keyed by SAP product ID (matches src/data/sapProducts.ts).
 */

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface Phase { phase: string; activities: string[] }
export interface CSF   { factor: string; description: string }
export interface Risk  { risk: string; impact: "High"|"Medium"|"Low"; probability: "High"|"Medium"|"Low"; mitigation: string }
export interface RACIRow { activity: string; responsible: string; accountable: string; consulted: string; informed: string }
export interface ServiceEntry {
  id: string; category: string; serviceName: string; description: string;
  included: boolean; tier: "Standard"|"Enhanced"|"Premium";
  slaTarget: string; deliverable: string; frequency: string;
}

// ─── Core data (always included regardless of product) ───────────────────────

export const CORE_PHASES: Phase[] = [
  { phase: "Prepare",  activities: ["Project governance & steering committee setup","System landscape design & infrastructure provisioning","Project charter and scope confirmation","Risk register initialisation"] },
  { phase: "Explore",  activities: ["Fit-to-standard workshop facilitation","Business process gap analysis & backlog creation","Data migration strategy & source system assessment","Integration landscape mapping"] },
  { phase: "Realize",  activities: ["Agile sprint-based system configuration","Unit and string testing","Data migration dry runs","Custom development (extensions via BTP)"] },
  { phase: "Deploy",   activities: ["User acceptance testing (UAT)","Cutover planning & dress rehearsal","End-user training delivery","Hypercare readiness sign-off"] },
  { phase: "Run",      activities: ["Post go-live hypercare (8 weeks)","Knowledge transfer to AMS team","Centre of Excellence (CoE) setup","Lessons learned retrospective"] },
];

export const CORE_CSFS: CSF[] = [
  { factor: "Executive Sponsorship",    description: "Active C-level ownership to drive change and resolve escalations." },
  { factor: "Fit-to-Standard Adoption", description: "Minimise custom development by adopting SAP best-practice processes." },
  { factor: "Data Quality",             description: "Early data cleanse to ensure clean migration and system integrity." },
  { factor: "Change Management",        description: "Structured OCM programme covering comms, engagement, and training." },
];

export const CORE_RISKS: Risk[] = [
  { risk: "Scope creep from uncontrolled change requests",      impact: "High",   probability: "High",   mitigation: "Enforce formal change control board with sign-off thresholds." },
  { risk: "Data migration quality issues causing go-live delay", impact: "High",   probability: "Medium", mitigation: "Iterative dry runs with automated validation from Realise phase." },
  { risk: "Low end-user adoption post go-live",                  impact: "Medium", probability: "Medium", mitigation: "Role-based training and designated super-user network." },
];

export const CORE_RACI: RACIRow[] = [
  { activity: "Project Governance & Steering",   responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Solution Architecture Design",    responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "System Configuration",            responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Data Migration Execution",        responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Integration Build & Testing",     responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "User Acceptance Testing",         responsible: "C", accountable: "A", consulted: "R", informed: "I" },
  { activity: "Change Management & Training",    responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Cutover Execution",               responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Go-Live Sign-Off",                responsible: "C", accountable: "A", consulted: "R", informed: "I" },
  { activity: "Hypercare Support",               responsible: "R", accountable: "A", consulted: "C", informed: "I" },
];

export const CORE_OUT_OF_SCOPE: string[] = [
  "Legacy system decommissioning and data archival",
  "Third-party application licensing and vendor management",
  "Infrastructure procurement and cloud hosting fees",
  "Post-hypercare BAU support (covered by separate AMS contract)",
  "Custom BI/reporting beyond agreed scope",
];

export const CORE_ASSUMPTIONS: string[] = [
  "Client will provide dedicated business process owners for each workstream",
  "A single production go-live is planned (no phased geographic rollout in scope)",
  "Legacy system will remain operational in parallel for 4 weeks post go-live",
  "All in-scope users will receive role-based training prior to go-live",
  "Project steering committee will meet fortnightly throughout",
  "Change requests will follow the agreed change control board process",
  "Client IT team will co-ordinate all infrastructure and basis activities",
];

export const CORE_DEPENDENCIES: string[] = [
  "SAP licences procured and systems provisioned prior to Realise phase",
  "Network connectivity and firewall rules confirmed for system landscape",
  "Business process owners allocated at 50%+ for workshop participation",
  "Source system data extracts available by start of Realise phase",
  "Third-party system APIs documented and accessible for integration design",
  "Security and compliance requirements confirmed before role design begins",
];

export const CORE_SERVICES: ServiceEntry[] = [
  { id: "inc-p1",    category: "Incident Management",          serviceName: "P1/P2 Critical Incident Response",       description: "24×7 triage and resolution for production-down incidents.",                    included: true, tier: "Standard",  slaTarget: "< 1 hr response / < 4 hr resolve", deliverable: "Incident closure report",      frequency: "On-demand" },
  { id: "inc-p3",    category: "Incident Management",          serviceName: "P3/P4 Standard Incident Management",     description: "Business-hours support for medium and low priority incidents.",               included: true, tier: "Standard",  slaTarget: "< 4 hr response / 2-day resolve",  deliverable: "Incident ticket closure",      frequency: "On-demand" },
  { id: "chg-std",   category: "Change Management",            serviceName: "Standard Change Deployment",             description: "Controlled deployment of tested changes to production.",                     included: true, tier: "Standard",  slaTarget: "5-day lead time",                  deliverable: "Change record & release notes", frequency: "Weekly"    },
  { id: "chg-emg",   category: "Change Management",            serviceName: "Emergency Change Facilitation",          description: "Fast-track approval and deployment of urgent production fixes.",              included: true, tier: "Enhanced",  slaTarget: "< 4 hr turnaround",               deliverable: "Emergency change report",      frequency: "On-demand" },
  { id: "prb-mgmt",  category: "Problem Management",           serviceName: "Root Cause Analysis & Problem Resolution",description: "Proactive investigation of recurring incidents to eliminate root causes.",  included: true, tier: "Enhanced",  slaTarget: "RCA within 5 business days",       deliverable: "Problem record with RCA",      frequency: "On-demand" },
  { id: "rel-mgmt",  category: "Release Management",           serviceName: "Transport & Release Coordination",       description: "End-to-end management of SAP transport requests across landscapes.",          included: true, tier: "Standard",  slaTarget: "Scheduled release windows",        deliverable: "Release manifest",              frequency: "Monthly"   },
  { id: "mon-sys",   category: "Monitoring & Alerting",        serviceName: "System Health Monitoring",               description: "Continuous monitoring of system availability and performance KPIs.",          included: true, tier: "Standard",  slaTarget: "99.5% uptime target",             deliverable: "Monthly health dashboard",      frequency: "Daily"     },
  { id: "mon-job",   category: "Monitoring & Alerting",        serviceName: "Batch Job Monitoring & Recovery",        description: "Automated monitoring of scheduled jobs with proactive failure recovery.",     included: true, tier: "Standard",  slaTarget: "Alert within 15 min of failure",   deliverable: "Job failure report",            frequency: "Daily"     },
  { id: "perf-tune", category: "Performance Management",       serviceName: "Performance Tuning & Optimisation",      description: "Periodic analysis and optimisation of system and database performance.",      included: true, tier: "Enhanced",  slaTarget: "Quarterly review cycle",           deliverable: "Performance optimisation report",frequency: "Quarterly" },
  { id: "sec-patch", category: "Security & Compliance",        serviceName: "Security Patch Management",              description: "Assessment and application of SAP security patches and notes.",              included: true, tier: "Standard",  slaTarget: "Critical patches within 30 days",  deliverable: "Patch compliance report",       frequency: "Monthly"   },
  { id: "sec-role",  category: "Security & Compliance",        serviceName: "Role & Authorisation Management",        description: "Design, maintain and audit SAP roles and user access controls.",              included: true, tier: "Standard",  slaTarget: "Access provisioned within 2 days", deliverable: "Access audit log",              frequency: "On-demand" },
  { id: "usr-admin", category: "User Administration",          serviceName: "User Provisioning & Deprovisioning",     description: "Lifecycle management of user accounts aligned to HR events.",                  included: true, tier: "Standard",  slaTarget: "< 1 business day",                 deliverable: "User change confirmation",      frequency: "On-demand" },
  { id: "rep-std",   category: "Reporting & Analytics",        serviceName: "Standard Report Support",                description: "Maintain and enhance standard reports and queries.",                         included: true, tier: "Standard",  slaTarget: "Change within 5 business days",    deliverable: "Updated report spec",           frequency: "On-demand" },
  { id: "trn-know",  category: "Training & Knowledge Transfer",serviceName: "Super-User Enablement & Knowledge Base",  description: "Maintain training materials and support the super-user network.",            included: true, tier: "Standard",  slaTarget: "Materials updated within 10 days", deliverable: "Updated training content",      frequency: "Quarterly" },
  { id: "ci-review", category: "Continuous Improvement",       serviceName: "Monthly Service Review",                 description: "Monthly governance meeting with KPI reporting and improvement backlog.",    included: true, tier: "Premium",   slaTarget: "Monthly governance meeting",        deliverable: "Service review pack",           frequency: "Monthly"   },
  { id: "ci-road",   category: "Continuous Improvement",       serviceName: "SAP Roadmap & Innovation Advisory",      description: "Quarterly advisory on SAP product updates and new capabilities.",             included: true, tier: "Premium",   slaTarget: "Quarterly innovation briefing",    deliverable: "Innovation briefing deck",      frequency: "Quarterly" },
];

// ─── Per-product data ─────────────────────────────────────────────────────────

export interface ProductData {
  extraPhaseActivities?: Partial<Record<string, string[]>>;
  csfs?: CSF[];
  risks?: Risk[];
  integrationPractices?: string[];
  recommendations?: string[];
  scopeItems?: string[];
  dependencies?: string[];
  assumptions?: string[];
  raciRows?: RACIRow[];
  services?: ServiceEntry[];
}

export const PRODUCT_DB: Record<string, ProductData> = {

  // ── S/4HANA ────────────────────────────────────────────────────────────────
  "s4hana": {
    extraPhaseActivities: {
      "Prepare":  ["Confirm SAP Activate roadmap and RISE with SAP commercial model","Technical infrastructure sizing for HANA database","Simplification Item Catalogue review from legacy ECC"],
      "Explore":  ["Fit-to-standard workshops per module (FI, CO, SD, MM, PP, QM)","Universal Journal architecture design","FIORI app catalogue and Launchpad design"],
      "Realize":  ["S/4HANA configuration across all in-scope modules","ABAP custom code remediation for S/4HANA compatibility","FIORI Launchpad and tile group setup","Security role design aligned to Fiori apps"],
      "Deploy":   ["Parallel financial period-end close rehearsal","Legacy-to-S/4HANA reconciliation validation"],
    },
    csfs: [
      { factor: "Clean Core Commitment",     description: "Enforce clean-core architecture — extensions via BTP, not core modifications." },
      { factor: "Finance Process Redesign",  description: "Leverage Universal Journal and Margin Analysis to simplify financial reporting." },
      { factor: "Simplification Review",     description: "Complete SAP Simplification Item Catalogue review early to prevent surprises." },
      { factor: "ABAP Remediation",          description: "All custom ABAP must pass SAP Readiness Check before Realise phase begins." },
    ],
    risks: [
      { risk: "Custom ABAP incompatible with S/4HANA",          impact: "High",   probability: "High",   mitigation: "Run SAP Readiness Check and ABAP Test Cockpit early; remediate in Prepare." },
      { risk: "Finance cutover complexity with open items",       impact: "High",   probability: "Medium", mitigation: "Dedicated finance cutover workstream with multiple dress rehearsals." },
      { risk: "FIORI performance issues for end users",           impact: "Medium", probability: "Low",    mitigation: "Front-end server sizing review and Launchpad performance testing." },
      { risk: "Business resistance to process standardisation",  impact: "Medium", probability: "High",   mitigation: "Executive mandate for fit-to-standard; exceptions require CFO/CIO sign-off." },
    ],
    integrationPractices: [
      "Use SAP Integration Suite (BTP) as standard middleware — avoid point-to-point interfaces.",
      "Leverage pre-built integration scenarios from SAP Business Accelerator Hub.",
      "Design API-first interfaces with versioned OData/REST endpoints.",
      "Implement end-to-end interface monitoring via SAP Cloud ALM.",
      "Use SAP Landscape Transformation for migration from legacy ECC landscapes.",
    ],
    recommendations: [
      "Adopt SAP Activate methodology and leverage Best Practice content to accelerate configuration.",
      "Commit to a clean-core strategy — use BTP extensions instead of core modifications.",
      "Establish a Finance transformation workstream to exploit Universal Journal simplifications.",
      "Plan for a minimum 8-week hypercare period with dedicated L1/L2 support teams.",
      "Deploy a Centre of Excellence (CoE) from go-live to sustain the solution.",
    ],
    scopeItems: [
      "SAP S/4HANA Finance (FI/CO) configuration and testing",
      "SAP S/4HANA Logistics (MM, SD, PP) configuration and testing",
      "Universal Journal and New Asset Accounting activation",
      "FIORI Launchpad design, tile configuration, and user onboarding",
      "ABAP custom code remediation for S/4HANA compatibility",
      "Data migration — master data (GL, vendor, customer, material) and open items",
      "SAP Integration Suite interface design, build, and testing",
      "Security role design and authorisation testing",
      "End-to-end SIT, UAT, and performance testing",
      "Cutover planning and execution including financial period-end close",
    ],
    dependencies: [
      "SAP S/4HANA licences procured and HANA infrastructure provisioned",
      "SAP Readiness Check results reviewed and remediation plan agreed",
      "Legacy ECC system accessible for data extraction and comparison testing",
      "Chart of accounts rationalisation and master data cleanse completed",
      "ABAP custom code inventory catalogue delivered by client IT",
      "Network bandwidth assessment for FIORI front-end server",
    ],
    assumptions: [
      "S/4HANA on-premise deployment on new HANA hardware (greenfield or brownfield)",
      "Client will adopt SAP standard processes for at least 80% of business scenarios",
      "A single production go-live date is planned for all modules in scope",
      "Client ABAP development team will support custom code remediation",
    ],
    services: [
      { id: "s4-basis",    category: "Monitoring & Alerting",  serviceName: "S/4HANA HANA DB Monitoring",      description: "Continuous HANA in-memory database health and memory monitoring.",    included: true, tier: "Standard",  slaTarget: "Alert within 10 min",              deliverable: "DB health report",            frequency: "Daily"     },
      { id: "s4-fiori",    category: "Performance Management", serviceName: "FIORI Launchpad Performance Mgmt", description: "Monitor and tune SAP Fiori front-end server and app response times.",  included: true, tier: "Enhanced",  slaTarget: "< 3 sec page load",               deliverable: "Fiori performance report",    frequency: "Monthly"   },
      { id: "s4-transport",category: "Change Management",      serviceName: "S/4HANA Transport Management",    description: "Governance of S/4HANA ABAP and customising transport requests.",       included: true, tier: "Standard",  slaTarget: "Transport release within 2 days",  deliverable: "Transport log",              frequency: "Weekly"    },
      { id: "s4-period",   category: "Change Management",      serviceName: "Period-End Close Support",         description: "Dedicated support during monthly and year-end financial close.",      included: true, tier: "Enhanced",  slaTarget: "0 P1 incidents during close",      deliverable: "Close completion report",    frequency: "Monthly"   },
      { id: "s4-data",     category: "Data Management",        serviceName: "Master Data Governance Support",   description: "Monitor and maintain S/4HANA master data quality and consistency.",   included: true, tier: "Standard",  slaTarget: "MDG review within 5 days",         deliverable: "MDG exception report",       frequency: "Monthly"   },
    ],
  },

  // ── S/4HANA Cloud ─────────────────────────────────────────────────────────
  "s4hana-cloud": {
    extraPhaseActivities: {
      "Prepare":  ["RISE with SAP contract activation and BTP tenant provisioning","Identity Authentication Service (IAS) and SSO setup","Three-system landscape confirmation (Dev/Test/Prod)"],
      "Explore":  ["Fit-to-standard workshops using SAP Best Practice Explorer","Integration Assessment for connected systems"],
      "Realize":  ["Quarterly upgrade strategy and regression test automation","BTP side-by-side extension build (no core modifications)"],
    },
    csfs: [
      { factor: "No-Modification Mandate",   description: "S/4HANA Cloud is locked — all extensions must be built on BTP as side-by-side apps." },
      { factor: "Upgrade Readiness",          description: "Maintain automated regression test suite from Day 1 to survive quarterly upgrades." },
    ],
    risks: [
      { risk: "Quarterly upgrades breaking BTP extensions",      impact: "High",   probability: "Medium", mitigation: "Isolated BTP extension design and automated regression pipeline." },
      { risk: "Limited configurability vs on-premise S/4HANA",   impact: "Medium", probability: "Medium", mitigation: "Thorough fit-gap in Explore with business sign-off on all gaps." },
    ],
    integrationPractices: [
      "Use SAP Integration Suite for all external system connections.",
      "Leverage standard API catalogue from SAP Business Accelerator Hub — no direct DB access.",
      "Event-driven integration via SAP Event Mesh for decoupled scenarios.",
    ],
    recommendations: [
      "Embrace standard processes — customisation is not available in cloud edition.",
      "Build a comprehensive automated regression suite before the first quarterly upgrade.",
      "Use SAP Cloud ALM for lifecycle and test management.",
    ],
    scopeItems: [
      "SAP S/4HANA Cloud FI/CO configuration and business process activation",
      "SAP Best Practice content activation and scope item selection",
      "BTP Identity Authentication (IAS) and single sign-on setup",
      "BTP side-by-side extension development for in-scope gaps",
      "SAP Integration Suite interface build for connected systems",
      "Automated regression test suite creation for quarterly upgrade readiness",
      "Data migration — master data and opening balances",
      "FIORI Launchpad personalisation and user onboarding",
      "UAT and cutover execution",
      "SAP Cloud ALM implementation for project and operations management",
    ],
    dependencies: [
      "RISE with SAP contract signed and BTP tenant activated",
      "IAS/IDP identity provider configured by client IT",
      "Connected system API documentation provided before Realise phase",
    ],
    services: [
      { id: "s4c-upgrade",  category: "Release Management",    serviceName: "Quarterly Upgrade Management",     description: "Co-ordinate testing and validation for SAP-managed quarterly upgrades.", included: true, tier: "Enhanced",  slaTarget: "Regression complete before upgrade", deliverable: "Upgrade test report",    frequency: "Quarterly" },
      { id: "s4c-btp",      category: "Integration Support",   serviceName: "BTP Extension Monitoring",         description: "Monitor and maintain BTP side-by-side extension health and APIs.",      included: true, tier: "Standard",  slaTarget: "Alert within 30 min",                deliverable: "BTP extension log",      frequency: "Daily"     },
    ],
  },

  // ── SAP ECC ───────────────────────────────────────────────────────────────
  "ecc": {
    extraPhaseActivities: {
      "Explore":  ["Module-by-module process workshops (FI, CO, MM, SD, PP)","Legacy customisation review and rationalisation"],
      "Realize":  ["IMG configuration and transport management","ABAP custom development","BDC/LSMW data migration programmes"],
    },
    csfs: [
      { factor: "Custom Code Management",    description: "Document and rationalise existing ABAP custom code to reduce future upgrade risk." },
      { factor: "S/4HANA Pathway",           description: "Plan ECC implementation with future S/4HANA migration in mind — avoid deep customisation." },
    ],
    risks: [
      { risk: "ECC going end of mainstream maintenance in 2027", impact: "High", probability: "High", mitigation: "Define and agree S/4HANA migration roadmap as part of this engagement." },
      { risk: "Excessive custom code accumulation",              impact: "Medium", probability: "High", mitigation: "Enforce custom code governance and clean-core principles from project start." },
    ],
    integrationPractices: [
      "Use SAP PI/PO or Integration Suite for all interfaces.",
      "Document all interfaces in Solution Manager for future S/4HANA migration.",
    ],
    recommendations: [
      "Treat this ECC implementation as a bridge to S/4HANA — plan the migration path now.",
      "Minimise custom code — every modification adds S/4HANA migration cost.",
    ],
    scopeItems: [
      "SAP ECC FI/CO configuration and testing",
      "SAP ECC MM/SD/PP logistics module configuration",
      "ABAP custom development within agreed scope",
      "BDC/LSMW data migration programme development",
      "SAP PI/PO integration interface build",
      "Security role design and SoD analysis",
      "SIT, UAT and performance testing",
      "Cutover planning and go-live execution",
    ],
    dependencies: [
      "SAP ECC licences and ABAP application server infrastructure provisioned",
      "Source system data extracts defined and accessible",
    ],
    services: [
      { id: "ecc-maint", category: "Monitoring & Alerting", serviceName: "ECC System Health & ABAP Monitoring", description: "Monitor SAP ECC application server, work processes, and ABAP dumps.", included: true, tier: "Standard", slaTarget: "Alert within 15 min", deliverable: "System health report", frequency: "Daily" },
    ],
  },

  // ── SAP SuccessFactors ────────────────────────────────────────────────────
  "successfactors": {
    extraPhaseActivities: {
      "Prepare":  ["HR data privacy and GDPR compliance review","SAP SuccessFactors tenant provisioning and IDP/SSO setup","Integration with S/4HANA or on-premise payroll scoping"],
      "Explore":  ["HR process design workshops per module (EC, Talent, Learning, Compensation)","Org structure and position management design","Employee Central configuration workbook completion"],
      "Realize":  ["Module-by-module configuration (Employee Central first as system of record)","Role-Based Permissions (RBP) design and testing","Integration Centre or Dell Boomi/CPI integration build"],
      "Deploy":   ["HR data migration from legacy HRIS","Manager and employee self-service training delivery"],
    },
    csfs: [
      { factor: "Employee Central First",     description: "Implement Employee Central as system of record before layering talent modules." },
      { factor: "Data Privacy by Design",     description: "Embed GDPR/data privacy controls into configuration from day one." },
      { factor: "HR Process Standardisation", description: "Standardise HR processes globally before configuring — process follows design, not vice versa." },
    ],
    risks: [
      { risk: "Legacy HR data quality preventing clean migration",    impact: "High",   probability: "High",   mitigation: "HR data audit and cleansing programme starting in Explore phase." },
      { risk: "Integration failures between SuccessFactors & payroll",impact: "High",   probability: "Medium", mitigation: "Dedicated integration workstream with payroll vendor engaged from Explore." },
      { risk: "Employee resistance to HR self-service processes",     impact: "Medium", probability: "Medium", mitigation: "Change management programme with line manager champions." },
    ],
    integrationPractices: [
      "Use SAP Integration Suite or Dell Boomi for SuccessFactors integrations.",
      "Leverage pre-built SAP SuccessFactors integration packages for S/4HANA/ECC payroll.",
      "Implement bi-directional org structure sync between Employee Central and finance systems.",
      "Use Employee Central as the single source of truth — disable direct system edits.",
    ],
    recommendations: [
      "Sequence rollout: Employee Central → Core HR → Talent modules.",
      "Establish a dedicated HRIS admin team to manage the platform post go-live.",
      "Build a global HR process catalogue before configuration begins.",
      "Plan for bi-annual SAP SuccessFactors release regression testing.",
    ],
    scopeItems: [
      "SAP SuccessFactors Employee Central (EC) — system of record configuration",
      "Organisational structure, position management, and job architecture design",
      "Role-Based Permissions (RBP) design and security configuration",
      "Talent module configuration (Recruiting, Onboarding, Performance, Learning — as in scope)",
      "Integration with payroll system (on-premise HCM or S/4HANA payroll)",
      "HR data migration from legacy HRIS",
      "Manager and employee self-service portal configuration",
      "Compliance and GDPR data privacy configuration",
      "UAT, data migration dress rehearsal, and go-live support",
    ],
    dependencies: [
      "SAP SuccessFactors licences provisioned and tenant activated",
      "Identity provider (IDP/SSO) configured for employee authentication",
      "Legacy HRIS data extract templates agreed and data freeze date confirmed",
      "Payroll system API documentation provided for integration design",
      "HR data privacy and GDPR requirements signed off by DPO",
    ],
    services: [
      { id: "sf-tenant",   category: "Monitoring & Alerting",        serviceName: "SuccessFactors Tenant Health Monitoring", description: "Monitor SuccessFactors instance availability and performance.",            included: true, tier: "Standard",  slaTarget: "SAP SLA passthrough (99.7%)",       deliverable: "Monthly availability report",  frequency: "Monthly"   },
      { id: "sf-release",  category: "Release Management",           serviceName: "Bi-Annual Release Testing",               description: "Co-ordinate regression testing for SAP SuccessFactors H1/H2 releases.",   included: true, tier: "Enhanced",  slaTarget: "Regression complete pre-release",  deliverable: "Release test sign-off",        frequency: "Bi-annual" },
      { id: "sf-rbp",      category: "Security & Compliance",        serviceName: "RBP Role & Permission Management",        description: "Manage role-based permission changes and access audits.",                   included: true, tier: "Standard",  slaTarget: "Change within 2 business days",    deliverable: "Access change record",         frequency: "On-demand" },
      { id: "sf-int",      category: "Integration Support",          serviceName: "SF-Payroll Integration Monitoring",       description: "Monitor and support payroll replication and integration jobs.",            included: true, tier: "Enhanced",  slaTarget: "Alert within 30 min of failure",   deliverable: "Integration exception report", frequency: "Daily"     },
      { id: "sf-data",     category: "Data Management",              serviceName: "Employee Data Quality Management",        description: "Periodic audits of employee master data for accuracy and completeness.",  included: true, tier: "Standard",  slaTarget: "Quarterly audit cycle",            deliverable: "Data quality report",          frequency: "Quarterly" },
    ],
  },

  // ── SAP SuccessFactors Employee Central ───────────────────────────────────
  "sf-ec": {
    scopeItems: [
      "Employee Central core HR configuration (employee profile, org structure, job info)",
      "Position management and headcount planning setup",
      "Time management and leave management configuration",
      "HR workflow design (onboarding, offboarding, transfers, promotions)",
    ],
    services: [
      { id: "sfec-wf", category: "Change Management", serviceName: "EC Workflow & Process Support", description: "Support and maintain Employee Central workflow rules and escalations.", included: true, tier: "Standard", slaTarget: "Change within 3 business days", deliverable: "Workflow change record", frequency: "On-demand" },
    ],
  },

  // ── SAP SuccessFactors Recruiting ─────────────────────────────────────────
  "sf-recruiting": {
    scopeItems: [
      "Recruiting Management job requisition and approval workflow",
      "Career site and candidate portal configuration",
      "Offer management and background check integration",
      "Recruiter and hiring manager training",
    ],
    services: [
      { id: "sfr-jobs", category: "User Administration", serviceName: "Recruiting Job Template Maintenance", description: "Maintain job requisition templates and approval workflows.", included: true, tier: "Standard", slaTarget: "Update within 3 days", deliverable: "Template update record", frequency: "On-demand" },
    ],
  },

  // ── SAP SuccessFactors Learning ───────────────────────────────────────────
  "sf-lms": {
    scopeItems: [
      "Learning Management System (LMS) configuration and curriculum design",
      "Content library setup and SCORM content migration",
      "Compliance training assignment and completion tracking",
      "Learning portal branding and employee self-enrolment configuration",
    ],
    services: [
      { id: "sfl-content", category: "Data Management", serviceName: "LMS Content & Curriculum Management", description: "Maintain LMS course catalogue, curricula, and compliance assignments.", included: true, tier: "Standard", slaTarget: "Content update within 5 days", deliverable: "Content update confirmation", frequency: "On-demand" },
    ],
  },

  // ── SAP Ariba ─────────────────────────────────────────────────────────────
  "ariba": {
    extraPhaseActivities: {
      "Prepare":  ["Ariba Network connectivity and supplier onboarding strategy","Procurement operating model review and category management design"],
      "Explore":  ["Source-to-pay process workshops (PR → PO → GR → Invoice → Payment)","Supplier segmentation and onboarding prioritisation","ERP integration design (S/4HANA/ECC MM and FI-AP)"],
      "Realize":  ["Buying and invoicing configuration and approval workflows","Ariba Network supplier enablement programme (Wave 1 suppliers)","ERP integration build (PO, GR, Invoice IDocs/APIs)"],
      "Deploy":   ["Supplier wave 1 onboarding and connectivity testing","Procurement policy and spend visibility training"],
    },
    csfs: [
      { factor: "Supplier Adoption",         description: "Supplier on-boarding is critical — without suppliers on Ariba Network, ROI is not realised." },
      { factor: "ERP Master Data Alignment",  description: "Clean vendor, GL, and cost centre master data is essential for straight-through processing." },
      { factor: "Category Coverage",          description: "Start with top-spend categories for maximum early ROI rather than trying to cover everything at once." },
    ],
    risks: [
      { risk: "Low supplier adoption of Ariba Network",             impact: "High",   probability: "High",   mitigation: "Dedicated supplier enablement team and tiered on-boarding programme." },
      { risk: "Master data mismatches between Ariba and ERP",       impact: "High",   probability: "Medium", mitigation: "Master data governance workstream with sync validation rules." },
      { risk: "Invoice discrepancy resolution process not defined",  impact: "Medium", probability: "Medium", mitigation: "Define and document dispute management SLA with AP team pre-go-live." },
    ],
    integrationPractices: [
      "Use standard cXML or EDI protocols for Ariba Network supplier transactions.",
      "Integrate with SAP S/4HANA MM via standard SAP API catalogue.",
      "Implement Ariba integration monitoring via SAP Cloud ALM.",
      "Use pre-built SAP Ariba integration packages from Business Accelerator Hub.",
    ],
    recommendations: [
      "Launch supplier enablement in Explore phase — don't wait until Deploy.",
      "Apply the 80/20 rule: focus on strategic spend categories for maximum early ROI.",
      "Establish a procurement governance board to manage catalogue and policy post go-live.",
    ],
    scopeItems: [
      "SAP Ariba Buying & Invoicing purchase-to-pay configuration",
      "Approval workflow design for purchase requisitions and orders",
      "Ariba Network supplier enablement — Wave 1 strategic suppliers",
      "Integration with ERP (S/4HANA or ECC) for PO, GR, and invoice posting",
      "Supplier invoice OCR and PO-matching rule configuration",
      "Spend category hierarchy and commodity code mapping",
      "Procurement policy enforcement and compliance reporting",
      "Buyer and AP team training and super-user enablement",
    ],
    dependencies: [
      "SAP Ariba licences provisioned and Ariba Network account activated",
      "ERP vendor master data cleansed and available for Ariba sync",
      "Top 50 strategic suppliers identified and contacted for onboarding",
      "Procurement policy documentation provided by category management team",
    ],
    services: [
      { id: "arb-net",    category: "Integration Support",   serviceName: "Ariba Network Connectivity Support",  description: "Monitor and resolve supplier transaction failures on Ariba Network.",     included: true, tier: "Standard",  slaTarget: "Alert within 1 hr of failure",    deliverable: "Transaction failure log",    frequency: "Daily"     },
      { id: "arb-sup",    category: "User Administration",   serviceName: "Supplier Onboarding & Administration", description: "Onboard new suppliers and manage existing supplier account changes.",    included: true, tier: "Standard",  slaTarget: "New supplier within 5 days",      deliverable: "Supplier activation record", frequency: "On-demand" },
      { id: "arb-cat",    category: "Data Management",       serviceName: "Catalogue & Commodity Management",     description: "Maintain Ariba catalogue content, pricing, and commodity code mapping.", included: true, tier: "Enhanced",  slaTarget: "Catalogue update within 5 days",  deliverable: "Catalogue update report",    frequency: "Monthly"   },
      { id: "arb-spend",  category: "Reporting & Analytics", serviceName: "Spend Analytics & Compliance Reporting",description: "Monthly spend visibility and procurement compliance reporting.",         included: true, tier: "Enhanced",  slaTarget: "Report published within 5 days",  deliverable: "Spend analytics dashboard",  frequency: "Monthly"   },
    ],
  },

  // ── SAP Ariba Sourcing ─────────────────────────────────────────────────────
  "ariba-sourcing": {
    scopeItems: [
      "SAP Ariba Sourcing event template configuration (RFI, RFQ, eAuction)",
      "Supplier qualification and approved vendor list setup",
      "Sourcing project workflow and approval configuration",
      "Integration with contract management for awarded sourcing events",
    ],
    services: [
      { id: "arbs-event", category: "Change Management", serviceName: "Sourcing Event Support", description: "Support category managers in creating and managing sourcing events.", included: true, tier: "Standard", slaTarget: "Response within 4 hours", deliverable: "Event setup confirmation", frequency: "On-demand" },
    ],
  },

  // ── SAP Ariba Contracts ───────────────────────────────────────────────────
  "ariba-contracts": {
    scopeItems: [
      "SAP Ariba Contracts repository and contract template configuration",
      "Contract authoring workflow and approval process design",
      "Contract compliance and obligation tracking setup",
      "Legal team contract template migration",
    ],
  },

  // ── SAP Ariba Buying & Invoicing ──────────────────────────────────────────
  "ariba-buying": {
    scopeItems: [
      "Guided buying catalogue and punchout site configuration",
      "Invoice reconciliation and PO-matching rule configuration",
      "Accounts payable automation and early payment discount setup",
      "P2P process training for requisitioners and approvers",
    ],
  },

  // ── SAP Fieldglass ────────────────────────────────────────────────────────
  "fieldglass": {
    scopeItems: [
      "SAP Fieldglass VMS configuration for contingent workforce management",
      "Supplier (staffing agency) onboarding and rate card configuration",
      "Work order and timesheet workflow configuration",
      "Integration with SAP Finance for PO and invoice posting",
    ],
    csfs: [
      { factor: "Supplier Adoption", description: "Staffing agency adoption of Fieldglass is critical for transaction straight-through processing." },
    ],
    risks: [
      { risk: "Staffing agencies resistant to Fieldglass adoption", impact: "High", probability: "Medium", mitigation: "Tiered onboarding with dedicated supplier support and commercial incentives." },
    ],
    integrationPractices: [
      "Integrate Fieldglass with SAP Ariba for unified procurement workflows.",
      "Use standard Fieldglass ERP connector for Finance posting integration.",
    ],
    recommendations: [
      "Mandate Fieldglass for all contingent spend above agreed threshold from Day 1.",
    ],
    services: [
      { id: "fg-agency", category: "User Administration", serviceName: "Agency & Worker Administration", description: "Manage staffing agency accounts and contingent worker records.", included: true, tier: "Standard", slaTarget: "Changes within 2 days", deliverable: "Worker change record", frequency: "On-demand" },
    ],
  },

  // ── SAP IBP ───────────────────────────────────────────────────────────────
  "ibp": {
    extraPhaseActivities: {
      "Prepare":  ["Supply chain data landscape and master data assessment","IBP module scoping (Demand, Supply, IBP S&OP, Inventory Optimisation)"],
      "Explore":  ["S&OP process design workshops and meeting cadence design","Statistical forecasting model selection and baseline validation","ERP integration design (S/4HANA/ECC MRP and stock data)"],
      "Realize":  ["Planning area and key figure configuration","Statistical baseline model training and validation","ERP integration for supply plan and inventory data replication"],
    },
    csfs: [
      { factor: "S&OP Process Discipline",  description: "IBP requires a structured S&OP meeting cadence — technology alone cannot drive the process." },
      { factor: "Master Data Accuracy",     description: "Accurate product hierarchy, lead times, and supply constraints are critical for planning accuracy." },
    ],
    risks: [
      { risk: "Forecast accuracy insufficient to justify IBP investment", impact: "High",   probability: "Medium", mitigation: "Benchmark baseline accuracy before go-live; set realistic improvement targets." },
      { risk: "ERP master data misaligned with IBP planning data",        impact: "High",   probability: "High",   mitigation: "Master data governance workstream with weekly sync validation." },
    ],
    integrationPractices: [
      "Use standard SAP IBP integration add-on for S/4HANA/ECC connectivity.",
      "Replicate master data via SAP Core Data Services (CDS) views.",
      "Integrate IBP with SAP Analytics Cloud for S&OP visualisation dashboards.",
    ],
    recommendations: [
      "Pilot IBP with one business unit before global rollout.",
      "Establish a dedicated S&OP process owner role — not just a tool administrator.",
      "Clean up ERP master data (lead times, lot sizes, BOMs) before IBP go-live.",
    ],
    scopeItems: [
      "SAP IBP Demand Planning module configuration and statistical model setup",
      "SAP IBP Supply Planning and constraint-based optimisation configuration",
      "IBP S&OP process design and consensus planning workflow",
      "ERP integration for actual demand, stock, and supply plan replication",
      "Statistical forecasting baseline model training and validation",
      "Key figure design and planning area configuration",
      "S&OP dashboard and analytics design",
      "Planner and S&OP team training",
    ],
    dependencies: [
      "SAP IBP tenant provisioned (cloud solution)",
      "ERP historical demand data (minimum 24 months) available for model training",
      "Product hierarchy and master data (material, vendor, plant) cleansed in ERP",
    ],
    services: [
      { id: "ibp-plan",  category: "Performance Management", serviceName: "IBP Planning Run Performance",   description: "Monitor and optimise IBP planning run times and supply optimisation jobs.", included: true, tier: "Enhanced", slaTarget: "Planning run complete within SLA", deliverable: "Run performance report", frequency: "Weekly"   },
      { id: "ibp-data",  category: "Integration Support",   serviceName: "IBP-ERP Data Replication Support",description: "Monitor and resolve ERP-to-IBP master data and actuals replication failures.", included: true, tier: "Standard", slaTarget: "Alert within 1 hr",               deliverable: "Replication exception log", frequency: "Daily" },
    ],
  },

  // ── SAP EWM ───────────────────────────────────────────────────────────────
  "ewm": {
    extraPhaseActivities: {
      "Prepare":  ["Warehouse layout, storage type, and zone design","Hardware (RF scanner, label printer) and WiFi coverage assessment"],
      "Explore":  ["Warehouse process workshops (inbound, outbound, cross-docking, physical inventory)","Embedded vs decoupled EWM architecture decision"],
      "Realize":  ["Warehouse structure, storage types, and sections configuration","Process orientation (putaway strategies, wave management, pick/pack/ship) configuration"],
    },
    csfs: [
      { factor: "Hardware Readiness",         description: "RF scanners, printers, and WiFi coverage must be validated before UAT begins." },
      { factor: "Process Standardisation",    description: "Standardise warehouse processes before configuration — custom processes add long-term maintenance cost." },
    ],
    risks: [
      { risk: "Hardware and WiFi issues during go-live",            impact: "High",   probability: "Medium", mitigation: "Hardware acceptance test and WiFi coverage survey completed before cutover." },
      { risk: "Stock count discrepancies at migration cutover",     impact: "High",   probability: "Medium", mitigation: "Full physical inventory count immediately before cutover weekend." },
    ],
    integrationPractices: [
      "Use embedded EWM (within S/4HANA) where possible to reduce integration complexity.",
      "Leverage standard goods receipt/issue integration between EWM and S/4HANA MM.",
    ],
    recommendations: [
      "Conduct a warehouse process optimisation review before EWM configuration begins.",
      "Plan a physical inventory count as part of cutover activities.",
      "Train warehouse supervisors as super users to drive shop-floor adoption.",
    ],
    scopeItems: [
      "SAP EWM warehouse structure design (storage types, sections, storage bins)",
      "Inbound process configuration (goods receipt, putaway strategies)",
      "Outbound process configuration (wave management, pick, pack, ship)",
      "Physical inventory and cycle counting process configuration",
      "RF scanner and label printing configuration and testing",
      "Integration with S/4HANA MM for goods movements",
      "WM-to-EWM migration from legacy warehouse management",
      "Warehouse team training and super-user enablement",
    ],
    dependencies: [
      "Warehouse layout drawings and storage bin numbering scheme finalised",
      "RF scanner hardware procured and WiFi infrastructure validated",
      "S/4HANA or ECC MM configuration complete and stable for integration testing",
    ],
    services: [
      { id: "ewm-rf",  category: "Monitoring & Alerting",  serviceName: "EWM RF & Hardware Support",   description: "Monitor RF scanner connectivity and label printer availability.",    included: true, tier: "Standard", slaTarget: "Alert within 30 min",        deliverable: "Hardware incident log",    frequency: "Daily" },
      { id: "ewm-wave",category: "Performance Management", serviceName: "Wave & Pick Performance Mgmt",description: "Monitor and optimise EWM wave creation and pick performance.",       included: true, tier: "Enhanced", slaTarget: "Wave complete per KPI target",deliverable: "Pick performance report",  frequency: "Weekly" },
    ],
  },

  // ── SAP BTP ───────────────────────────────────────────────────────────────
  "btp": {
    extraPhaseActivities: {
      "Prepare":  ["BTP global account setup and subaccount governance strategy","Identity Authentication (IAS) and SAP Cloud Identity Provisioning setup"],
      "Explore":  ["Integration architecture design (hub-and-spoke vs point-to-point)","API catalogue and event landscape mapping"],
      "Realize":  ["iFlow development and API proxy configuration","Event Mesh setup for asynchronous scenarios","Extension applications on BTP Cloud Foundry or Kyma"],
    },
    csfs: [
      { factor: "Platform Governance",       description: "Establish BTP account governance with clear subaccount, entitlement, and cost allocation." },
      { factor: "Integration Standards",     description: "Define enterprise integration standards (API naming, error handling, monitoring) before build." },
    ],
    risks: [
      { risk: "BTP service quota exceeded causing downstream outages", impact: "High",   probability: "Low",    mitigation: "Capacity planning at Prepare phase; set up quota threshold alerts." },
      { risk: "Integration failures cascading across connected systems",impact: "High",   probability: "Medium", mitigation: "Circuit-breaker patterns and dead-letter queue monitoring." },
    ],
    integrationPractices: [
      "Adopt API-first strategy with versioned endpoints on BTP API Management.",
      "Use Event Mesh for asynchronous decoupled integration scenarios.",
      "Centralise monitoring via SAP Cloud ALM Integration Monitoring.",
      "Use pre-built adapters and iPackages from Business Accelerator Hub before building custom.",
    ],
    recommendations: [
      "Define a BTP Centre of Excellence with platform admin, integration, and developer roles.",
      "Implement Infrastructure-as-Code for BTP subaccount configuration (Terraform or btp CLI).",
      "Use SAP Integration Assessment methodology before building any custom iFlows.",
    ],
    scopeItems: [
      "SAP BTP global account and subaccount governance design",
      "SAP Integration Suite (Cloud Integration) iFlow development for in-scope interfaces",
      "API Management — API proxy, policies, and developer portal setup",
      "Event Mesh configuration for asynchronous event-driven integration",
      "BTP Extension Suite applications for agreed in-scope gaps",
      "Identity Authentication Service (IAS) and SSO configuration",
      "SAP Cloud ALM integration and operations monitoring setup",
      "BTP security and entitlement governance configuration",
      "Developer onboarding and BTP operations team enablement",
    ],
    dependencies: [
      "BTP global account provisioned and entitlements assigned",
      "All connected system API specifications provided",
      "Network firewall rules opened for BTP connectivity",
      "IAS/IDP identity provider configured",
    ],
    services: [
      { id: "btp-iflow", category: "Integration Support",   serviceName: "Integration Suite iFlow Monitoring",   description: "Monitor iFlow execution, message processing, and error queues.",           included: true, tier: "Standard",  slaTarget: "Alert within 30 min of failure", deliverable: "Interface exception log",    frequency: "Daily"     },
      { id: "btp-api",   category: "Performance Management",serviceName: "API Management Performance Monitoring", description: "Monitor API gateway performance, throttling, and availability.",           included: true, tier: "Enhanced",  slaTarget: "< 500ms API response SLA",       deliverable: "API performance report",    frequency: "Monthly"   },
      { id: "btp-ent",   category: "Security & Compliance", serviceName: "BTP Entitlement & Cost Governance",    description: "Monthly review of BTP service consumption vs entitlements and budget.",   included: true, tier: "Enhanced",  slaTarget: "Monthly cost report",             deliverable: "BTP consumption report",    frequency: "Monthly"   },
      { id: "btp-ext",   category: "Change Management",     serviceName: "BTP Extension Deployment Management",  description: "Deploy and version-manage BTP CAP/Fiori extension applications.",           included: true, tier: "Standard",  slaTarget: "Deploy within 5 days",            deliverable: "Extension release record",  frequency: "On-demand" },
    ],
  },

  // ── SAP Integration Suite ─────────────────────────────────────────────────
  "btp-integration": {
    scopeItems: [
      "SAP Integration Suite tenant provisioning and landscape connectivity",
      "iFlow development for all agreed inbound and outbound interfaces",
      "API Management — proxy, policies, throttling, and developer portal",
      "Pre-packaged integration (iPackages) configuration from Accelerator Hub",
      "Integration monitoring and alerting via SAP Cloud ALM",
    ],
    services: [
      { id: "is-adapter", category: "Integration Support", serviceName: "Adapter & iPackage Maintenance", description: "Update and patch Integration Suite adapters and pre-packaged iFlows.", included: true, tier: "Standard", slaTarget: "Patch within 10 business days", deliverable: "Adapter update record", frequency: "Monthly" },
    ],
  },

  // ── SAP Analytics Cloud ───────────────────────────────────────────────────
  "ac": {
    extraPhaseActivities: {
      "Prepare":  ["SAC tenant provisioning and data source connectivity assessment (live vs import)"],
      "Explore":  ["BI and planning requirements workshops","KPI catalogue and data model design"],
      "Realize":  ["Story and dashboard development","Planning model configuration (financial/operational)","Live connection to S/4HANA, BW/4HANA, or HANA Cloud"],
    },
    csfs: [
      { factor: "Data Quality at Source",   description: "SAC visualisations are only as good as the underlying data — source quality is paramount." },
      { factor: "Business Co-Design",       description: "Finance and business owners must co-design dashboards — IT alone cannot define useful analytics." },
      { factor: "Governed Analytics Estate",description: "Avoid shadow IT analytics by governing SAC story ownership and deprecating legacy Excel reports." },
    ],
    risks: [
      { risk: "Performance issues with large live-connection datasets", impact: "Medium", probability: "Medium", mitigation: "Import mode modelling for large datasets; live connection only for real-time KPIs." },
      { risk: "Proliferation of unmanaged stories creating confusion",  impact: "Medium", probability: "High",   mitigation: "Establish a governed SAC analytics catalogue with story ownership." },
    ],
    integrationPractices: [
      "Use SAP HANA Live or BW/4HANA as the semantic layer for SAC live connections.",
      "Leverage OData services from S/4HANA for real-time operational reporting.",
      "Integrate SAC Planning with SAP IBP for integrated supply-finance planning.",
      "Use SAC Data Analyzer for ad-hoc analysis without building full stories.",
    ],
    recommendations: [
      "Start with a KPI catalogue before building any dashboards.",
      "Govern the analytics estate — assign story owners and a quarterly review cycle.",
      "Migrate critical Excel planning models to SAC Planning for auditability and collaboration.",
    ],
    scopeItems: [
      "SAP Analytics Cloud tenant provisioning and user management",
      "KPI catalogue design and prioritisation with business stakeholders",
      "Live data connection to S/4HANA, BW/4HANA, or HANA Cloud",
      "Financial reporting and operational dashboard story development",
      "SAC Planning model configuration for financial/operational planning",
      "Analytics story catalogue governance and ownership framework",
      "Business user training and self-service analytics enablement",
    ],
    dependencies: [
      "SAC tenant provisioned (cloud)",
      "Source data model (BW/4HANA or HANA Live) stable and documented",
      "KPI definitions and data lineage approved by Finance/business stakeholders",
    ],
    services: [
      { id: "ac-story",   category: "Reporting & Analytics",  serviceName: "SAC Story & Dashboard Maintenance",  description: "Maintain and update SAC stories, models, and data connections.",         included: true, tier: "Standard",  slaTarget: "Update within 5 business days", deliverable: "Story update record",      frequency: "On-demand" },
      { id: "ac-plan",    category: "Performance Management", serviceName: "SAC Planning Model Performance",     description: "Monitor and optimise SAC planning model performance and data loads.",   included: true, tier: "Enhanced",  slaTarget: "Plan run within agreed SLA",    deliverable: "Planning performance log", frequency: "Monthly"   },
      { id: "ac-licence", category: "User Administration",    serviceName: "SAC User & Licence Management",      description: "Manage SAC user roles, story access, and licence consumption.",          included: true, tier: "Standard",  slaTarget: "Access within 1 business day",  deliverable: "Access change record",     frequency: "On-demand" },
    ],
  },

  // ── SAP BW/4HANA ─────────────────────────────────────────────────────────
  "bw4hana": {
    scopeItems: [
      "SAP BW/4HANA data warehouse design and implementation",
      "Data layer architecture (PSA, DSO, CompositeProvider, HANA models)",
      "ETL process design and data transformation build",
      "Migration from legacy BW to BW/4HANA",
      "Integration with SAP Analytics Cloud for consumption layer",
    ],
    csfs: [
      { factor: "Data Governance",  description: "BW/4HANA is only as valuable as the quality and trust in its underlying data." },
    ],
    services: [
      { id: "bw4-etl", category: "Monitoring & Alerting", serviceName: "BW/4HANA Data Load Monitoring", description: "Monitor ETL data load chains and alert on failures or data quality exceptions.", included: true, tier: "Standard", slaTarget: "Alert within 30 min", deliverable: "Load chain exception report", frequency: "Daily" },
    ],
  },

  // ── SAP Concur ────────────────────────────────────────────────────────────
  "concur": {
    extraPhaseActivities: {
      "Prepare":  ["SAP Concur entity and policy configuration planning","Corporate credit card programme and TMC (Travel Management Company) integration scoping"],
      "Explore":  ["Travel and expense policy design workshops","ERP (FI/CO) integration mapping for cost centre, GL, and tax codes"],
      "Realize":  ["Expense type and policy rule configuration","Corporate credit card feed and ERP integration build","Mobile app deployment and receipt capture testing"],
    },
    csfs: [
      { factor: "Policy Simplification",  description: "Simplify expense policy before configuration — complex policy results in poor user experience." },
      { factor: "Mobile App Adoption",    description: "Drive Concur mobile app adoption to maximise receipt capture and reduce manual audit work." },
    ],
    risks: [
      { risk: "Corporate card feed failures disrupting expense reporting", impact: "Medium", probability: "Medium", mitigation: "Dual-feed setup with reconciliation alerts and fallback manual upload." },
      { risk: "ERP posting errors from Concur journal entries",           impact: "High",   probability: "Medium", mitigation: "Finance team validation of GL account mapping before UAT." },
    ],
    integrationPractices: [
      "Use standard Concur Financial Connector for SAP ERP integration.",
      "Leverage Concur App Centre for pre-built TMC and aggregator integrations.",
      "Configure automated GL posting with daily batch runs and exception alerting.",
    ],
    recommendations: [
      "Simplify T&E policy to cover 80% of use cases — handle exceptions manually.",
      "Enforce receipt capture via mobile app from Day 1 to reduce audit cost.",
      "Automate GL posting to ERP with daily reconciliation and exception reporting.",
    ],
    scopeItems: [
      "SAP Concur entity setup and T&E policy configuration",
      "Expense type and approval workflow configuration",
      "Corporate credit card feed integration and reconciliation setup",
      "ERP (FI/CO) integration for GL posting and cost centre allocation",
      "Travel Management Company (TMC) and booking tool integration",
      "Mobile app deployment and receipt capture configuration",
      "Tax and VAT reclaim configuration (where applicable)",
      "Employee and approver training and adoption programme",
    ],
    dependencies: [
      "SAP Concur licences provisioned and entity activated",
      "Corporate credit card programme details provided by Finance",
      "ERP chart of accounts and cost centre mapping documented",
      "TMC/booking tool API credentials provided",
    ],
    services: [
      { id: "con-card",  category: "Integration Support",   serviceName: "Corporate Card Feed Monitoring",    description: "Monitor daily corporate card transaction feeds and reconciliation.",      included: true, tier: "Standard",  slaTarget: "Alert within 4 hrs of feed failure", deliverable: "Feed reconciliation report", frequency: "Daily"  },
      { id: "con-post",  category: "Integration Support",   serviceName: "ERP Posting Integration Support",   description: "Monitor and support daily GL posting from Concur to SAP ERP.",            included: true, tier: "Enhanced",  slaTarget: "Posting complete by 08:00 daily",    deliverable: "Posting exception log",      frequency: "Daily"  },
      { id: "con-audit", category: "Security & Compliance", serviceName: "Expense Audit & Compliance Reporting",description: "Monthly expense compliance reporting and policy adherence analysis.",    included: true, tier: "Enhanced",  slaTarget: "Monthly report published",           deliverable: "Expense compliance report",  frequency: "Monthly"},
      { id: "con-admin", category: "User Administration",   serviceName: "Concur User & Entity Administration",description: "Manage Concur user accounts, expense delegates, and entity settings.",  included: true, tier: "Standard",  slaTarget: "User change within 1 business day",  deliverable: "User change record",         frequency: "On-demand"},
    ],
  },

  // ── SAP Concur modules (inherit from parent) ──────────────────────────────
  "concur-travel": {
    scopeItems: ["Concur Travel booking tool integration and travel policy configuration","Preferred hotel and airline programme setup","Travel risk and duty of care reporting"],
  },
  "concur-expense": {
    scopeItems: ["Concur Expense expense type catalogue and approval workflow","Per diem rate configuration by country/region","Itemisation and personal expense split configuration"],
  },
  "concur-invoice": {
    scopeItems: ["Concur Invoice AP automation and OCR configuration","3-way PO matching rule configuration","Vendor payment and AP reporting"],
  },

  // ── SAP GRC ───────────────────────────────────────────────────────────────
  "grc": {
    extraPhaseActivities: {
      "Prepare":  ["GRC scope confirmation (Access Control, Process Control, Risk Management)","Risk taxonomy and control framework design with audit team"],
      "Explore":  ["Role design workshops and SoD ruleset review with internal audit","Risk and control catalogue mapping to business processes"],
      "Realize":  ["Access Control provisioning workflow configuration","SoD ruleset upload and Emergency Access Management (Firefighter) setup","Control testing automation setup in Process Control"],
    },
    csfs: [
      { factor: "SoD Ruleset Accuracy",   description: "The SoD ruleset must be validated with audit — incorrect rules undermine compliance posture." },
      { factor: "Business Role Design",   description: "Clean business role design before GRC prevents SoD conflicts at source rather than treating symptoms." },
      { factor: "Audit Engagement",       description: "Internal audit must co-own the SoD and control framework — GRC cannot succeed as an IT-only project." },
    ],
    risks: [
      { risk: "SoD conflicts in existing role assignments blocking go-live",  impact: "High",   probability: "High",   mitigation: "Early SoD analysis and risk acceptance process with audit sign-off." },
      { risk: "Firefighter log review not performed by management",           impact: "High",   probability: "Medium", mitigation: "Automated log alerts and mandatory review workflow with escalation." },
      { risk: "GRC tool perceived as compliance overhead rather than enabler",impact: "Medium", probability: "Medium", mitigation: "Executive framing of GRC as risk intelligence platform, not policing tool." },
    ],
    integrationPractices: [
      "Integrate GRC Access Control with S/4HANA via standard SPML/SOAP provisioning.",
      "Connect GRC Risk Management to audit management tooling for issue tracking.",
      "Use GRC BRM (Business Role Management) for role lifecycle governance.",
    ],
    recommendations: [
      "Engage internal audit in SoD ruleset design — not just IT security.",
      "Implement preventive SoD checks in provisioning workflow, not only detective.",
      "Run a role remediation programme before go-live to reduce residual risk.",
      "Schedule quarterly SoD ruleset reviews to keep pace with system changes.",
    ],
    scopeItems: [
      "SAP GRC Access Control — SoD analysis, mitigation, and access request management",
      "Emergency Access Management (Firefighter) configuration and log review workflow",
      "SAP GRC Business Role Management (BRM) role lifecycle configuration",
      "SoD ruleset design and validation with internal audit",
      "Provisioning workflow integration with S/4HANA/ECC authorisations",
      "Process Control control catalogue and automated monitoring setup",
      "GRC dashboards and compliance reporting",
      "Security and audit team training",
    ],
    dependencies: [
      "S/4HANA or ECC role design completed and available for SoD analysis",
      "Internal audit team available for SoD ruleset validation workshops",
      "GRC licence provisioned and connector to ERP systems configured",
    ],
    services: [
      { id: "grc-sod",   category: "Security & Compliance",  serviceName: "SoD Monitoring & Remediation",         description: "Continuous SoD conflict monitoring and remediation tracking.",            included: true, tier: "Enhanced", slaTarget: "High-risk SoD report within 5 days", deliverable: "SoD exception report",      frequency: "Monthly"   },
      { id: "grc-ff",    category: "Security & Compliance",  serviceName: "Firefighter Log Review Management",    description: "Ensure timely Firefighter log review and escalation workflow management.", included: true, tier: "Enhanced", slaTarget: "Review within 72 hrs of session",    deliverable: "FF log review record",      frequency: "On-demand" },
      { id: "grc-prov",  category: "User Administration",    serviceName: "Access Request & Provisioning Support", description: "Manage GRC access request workflow and provisioning to ERP roles.",        included: true, tier: "Standard", slaTarget: "Provisioned within 2 business days", deliverable: "Access provisioning record", frequency: "On-demand" },
      { id: "grc-audit", category: "Reporting & Analytics",  serviceName: "Compliance & Audit Reporting",         description: "Quarterly compliance dashboards and audit evidence packages.",            included: true, tier: "Premium",  slaTarget: "Report within 5 days of quarter end",deliverable: "Compliance audit pack",      frequency: "Quarterly" },
    ],
  },

  // ── SAP CX Sales Cloud ────────────────────────────────────────────────────
  "cx-sales": {
    scopeItems: [
      "SAP Sales Cloud CRM configuration (accounts, contacts, leads, opportunities)",
      "Sales pipeline and forecast configuration",
      "Territory and quota management setup",
      "ERP integration for customer master and order creation",
      "Mobile CRM app deployment for field sales team",
    ],
    csfs: [
      { factor: "CRM Data Hygiene",     description: "Clean customer and account master data is the foundation of effective CRM." },
      { factor: "Sales User Adoption",  description: "Sales team adoption is the biggest CRM risk — invest heavily in training and change management." },
    ],
    risks: [
      { risk: "Sales team resistance to CRM adoption",                impact: "High",   probability: "High",   mitigation: "Involve sales leadership in design; demonstrate value through pipeline visibility." },
      { risk: "Customer master data duplication between CRM and ERP", impact: "Medium", probability: "High",   mitigation: "Master data governance defining ERP as system of record for customer master." },
    ],
    integrationPractices: [
      "Integrate Sales Cloud with S/4HANA for real-time customer, pricing, and order data.",
      "Use SAP Integration Suite for the CRM-ERP middleware layer.",
    ],
    recommendations: [
      "Appoint a CRM champion in the sales leadership team to drive adoption.",
      "Integrate CRM pipeline data with SAC for management reporting from Day 1.",
    ],
    services: [
      { id: "cx-mob", category: "User Administration", serviceName: "Mobile CRM User & Device Management", description: "Manage Sales Cloud mobile app access and device entitlements.", included: true, tier: "Standard", slaTarget: "Access within 1 business day", deliverable: "Device enrolment record", frequency: "On-demand" },
    ],
  },

  // ── SAP Commerce Cloud ────────────────────────────────────────────────────
  "cx-commerce": {
    extraPhaseActivities: {
      "Prepare":  ["Commerce platform sizing, CDN strategy, and hosting design"],
      "Explore":  ["Customer journey mapping and storefront UX design","Product catalogue structure and pricing engine design"],
      "Realize":  ["Storefront accelerator customisation and responsive design","OCC REST API integration with ERP for order, pricing, and inventory","Payment gateway, search, and third-party integrations"],
    },
    csfs: [
      { factor: "Performance Engineering", description: "Commerce must handle peak load — performance testing at realistic scale is non-negotiable." },
      { factor: "Omnichannel Consistency", description: "Product, pricing, and inventory must be consistent across all channels in real time." },
    ],
    risks: [
      { risk: "Storefront performance issues under peak/promotional load", impact: "High",   probability: "Medium", mitigation: "Load testing at 3× peak before go-live; CDN and caching strategy." },
      { risk: "Price/availability data lag causing customer complaints",   impact: "High",   probability: "Medium", mitigation: "Near-real-time OCC API integration with sub-5-second SLA." },
    ],
    integrationPractices: [
      "Use SAP Commerce OCC REST APIs for headless/composable commerce scenarios.",
      "Integrate with SAP S/4HANA for order management via standard adapters.",
      "Leverage SAP Customer Data Cloud for consent management and authentication.",
    ],
    recommendations: [
      "Adopt an API-first / headless architecture for future-proof composability.",
      "Invest in CDN and edge caching to achieve sub-2-second page loads globally.",
      "Establish a dedicated commerce operations team for catalogue and promotion management.",
    ],
    scopeItems: [
      "SAP Commerce Cloud platform provisioning and accelerator setup",
      "Product catalogue import, taxonomy, and search configuration",
      "Storefront responsive design and UI customisation",
      "OCC REST API integration with SAP ERP for pricing, inventory, and order management",
      "Payment gateway integration and PCI-DSS compliance configuration",
      "Search and merchandising (SOLR) configuration",
      "Customer account and order management portal",
      "Performance and load testing at peak scenarios",
      "UAT and go-live support",
    ],
    services: [
      { id: "cx-cdn",  category: "Performance Management", serviceName: "Commerce CDN & Storefront Performance", description: "Monitor storefront response times, CDN cache hit rates, and availability.", included: true, tier: "Enhanced",  slaTarget: "< 2 sec page load / 99.9% uptime",deliverable: "Storefront performance report", frequency: "Daily"     },
      { id: "cx-pmt",  category: "Integration Support",   serviceName: "Payment Gateway Integration Support",   description: "Monitor and support payment gateway transactions and failure handling.",  included: true, tier: "Enhanced",  slaTarget: "Alert within 15 min of failure",  deliverable: "Payment exception log",        frequency: "On-demand" },
      { id: "cx-cat",  category: "Data Management",       serviceName: "Product Catalogue & Pricing Management",description: "Maintain product catalogue, pricing rules, and promotional campaigns.",     included: true, tier: "Standard",  slaTarget: "Update published within 4 hrs",  deliverable: "Catalogue update confirmation", frequency: "On-demand" },
    ],
  },

  // ── SAP HANA ──────────────────────────────────────────────────────────────
  "hana": {
    scopeItems: [
      "SAP HANA database installation and landscape configuration (Dev/Test/Prod)",
      "HANA data modelling (Calculation Views, Analytic/Attribute Views)",
      "HANA security and authorisation configuration",
      "Backup, recovery, and high-availability (HA/DR) configuration",
      "Performance tuning and memory sizing optimisation",
    ],
    services: [
      { id: "hana-db",  category: "Monitoring & Alerting",  serviceName: "HANA Database Health Monitoring", description: "Continuous HANA memory, CPU, and service health monitoring.",              included: true, tier: "Standard",  slaTarget: "Alert within 10 min",              deliverable: "HANA health report",    frequency: "Daily"    },
      { id: "hana-bkp", category: "Data Management",        serviceName: "HANA Backup & Recovery Management",description: "Manage HANA backup schedules and validate recovery readiness.",             included: true, tier: "Standard",  slaTarget: "Backup validated weekly",          deliverable: "Backup validation log", frequency: "Weekly"   },
      { id: "hana-perf",category: "Performance Management", serviceName: "HANA Performance Tuning",          description: "Periodic HANA memory and query performance analysis and optimisation.",   included: true, tier: "Enhanced",  slaTarget: "Quarterly tuning cycle",           deliverable: "Performance tuning report",frequency:"Quarterly"},
    ],
  },

  // ── SAP Datasphere ────────────────────────────────────────────────────────
  "datasphere": {
    scopeItems: [
      "SAP Datasphere (Business Data Fabric) tenant provisioning",
      "Data space and data layer architecture design",
      "Data integration from SAP and non-SAP sources",
      "Business semantic layer and data product design",
      "Federated analytics connection to SAP Analytics Cloud",
    ],
    services: [
      { id: "ds-fabric", category: "Data Management", serviceName: "Datasphere Data Product Maintenance", description: "Maintain and update Datasphere data products, spaces, and access controls.", included: true, tier: "Enhanced", slaTarget: "Update within 5 business days", deliverable: "Data product update record", frequency: "On-demand" },
    ],
  },

  // ── SAP PPM / PS ─────────────────────────────────────────────────────────
  "ppm": {
    scopeItems: [
      "SAP PPM portfolio and project structure configuration",
      "Resource demand and capacity planning setup",
      "Project financial planning integration with FI/CO",
      "Gate and decision point review workflow configuration",
    ],
  },
  "ps": {
    scopeItems: [
      "SAP PS project structure (WBS, network, activities) configuration",
      "Project budgeting and cost planning integration with CO",
      "Material and resource planning integration with MM/HR",
      "Project reporting and earned value analysis setup",
    ],
  },

  // ── SAP EAM ───────────────────────────────────────────────────────────────
  "eam": {
    scopeItems: [
      "SAP PM/EAM functional location and equipment hierarchy configuration",
      "Preventive maintenance plan and task list configuration",
      "Work order management and mobile maintenance configuration",
      "Integration with MM for spare parts and procurement",
      "Asset health reporting and KPI dashboard setup",
    ],
    services: [
      { id: "eam-pm", category: "Monitoring & Alerting", serviceName: "PM Maintenance Order Monitoring", description: "Monitor overdue maintenance orders and preventive maintenance compliance.", included: true, tier: "Standard", slaTarget: "Overdue alert within 24 hrs", deliverable: "Maintenance compliance report", frequency: "Weekly" },
    ],
  },

  // ── SAP GRC ─── duplicated key shorthand for sub-modules ─────────────────
  "sustainability": {
    scopeItems: [
      "SAP Sustainability Footprint Management carbon data collection setup",
      "Emission factor library and calculation rule configuration",
      "ESG KPI and reporting framework design",
      "Integration with SAP ERP for activity data feeds",
    ],
    services: [
      { id: "sus-report", category: "Reporting & Analytics", serviceName: "ESG & Sustainability Reporting", description: "Quarterly ESG data validation and sustainability report pack preparation.", included: true, tier: "Premium", slaTarget: "Report within 10 days of quarter end", deliverable: "ESG sustainability report", frequency: "Quarterly" },
    ],
  },
};

// ─── Alias / parent-inheritance map ──────────────────────────────────────────
// Child product IDs that should inherit data from a parent product
export const PARENT_MAP: Record<string, string> = {
  "sf-recruiting":  "successfactors",
  "sf-onboarding":  "successfactors",
  "sf-performance": "successfactors",
  "sf-compensation":"successfactors",
  "sf-succession":  "successfactors",
  "ariba-sourcing": "ariba",
  "ariba-contracts":"ariba",
  "ariba-buying":   "ariba",
  "concur-travel":  "concur",
  "concur-expense": "concur",
  "concur-invoice": "concur",
  "btp-extension":  "btp",
  "cpi":            "btp-integration",
  "pi-po":          "btp",
  "hana-cloud":     "hana",
  "bw":             "bw4hana",
  "bpc":            "ac",
  "cx-service":     "cx-sales",
  "cx-marketing":   "cx-sales",
  "cx-data":        "cx-sales",
  "crm":            "cx-sales",
  "solman":         "btp",
  "is-retail":      "s4hana",
  "is-utilities":   "s4hana",
  "is-banking":     "s4hana",
  "ecc":            "ecc",
  "tm":             "ewm",
  "slm":            "ariba",
  "apo":            "ibp",
  "irpa":           "btp",
  "ai-core":        "btp",
  "ai-launchpad":   "btp",
  "conversational-ai":"btp",
  "revenue-cloud":  "cx-sales",
  "cpq":            "cx-sales",
  "fcc":            "s4hana",
  "grc":            "grc",
  "iam":            "eam",
  "climate21":      "sustainability",
  "lms":            "btp",
};

// ─── Name → ID lookup ─────────────────────────────────────────────────────────
// Maps lowercase product display names to product IDs
export const NAME_TO_ID: Record<string, string> = {
  "sap s/4hana": "s4hana",
  "sap s/4hana cloud": "s4hana-cloud",
  "sap ecc (erp central component)": "ecc",
  "sap bw/4hana": "bw4hana",
  "sap bw (business warehouse)": "bw",
  "sap sales cloud": "cx-sales",
  "sap service cloud": "cx-service",
  "sap marketing cloud": "cx-marketing",
  "sap commerce cloud": "cx-commerce",
  "sap customer data cloud": "cx-data",
  "sap crm (on-premise)": "crm",
  "sap successfactors": "successfactors",
  "sap successfactors recruiting": "sf-recruiting",
  "sap successfactors onboarding": "sf-onboarding",
  "sap successfactors learning": "sf-lms",
  "sap successfactors performance & goals": "sf-performance",
  "sap successfactors compensation": "sf-compensation",
  "sap successfactors succession & development": "sf-succession",
  "sap successfactors employee central": "sf-ec",
  "sap successfactors employee central payroll": "sf-ec-payroll",
  "sap hcm (on-premise)": "hcm",
  "sap ariba": "ariba",
  "sap ariba sourcing": "ariba-sourcing",
  "sap ariba contracts": "ariba-contracts",
  "sap ariba buying & invoicing": "ariba-buying",
  "sap fieldglass": "fieldglass",
  "sap ibp (integrated business planning)": "ibp",
  "sap apo (advanced planning & optimization)": "apo",
  "sap ewm (extended warehouse management)": "ewm",
  "sap tm (transportation management)": "tm",
  "sap slm (supplier lifecycle management)": "slm",
  "sap concur": "concur",
  "sap concur travel": "concur-travel",
  "sap concur expense": "concur-expense",
  "sap concur invoice": "concur-invoice",
  "sap grc (governance, risk & compliance)": "grc",
  "sap financial closing cockpit": "fcc",
  "sap analytics cloud": "ac",
  "sap bpc (business planning & consolidation)": "bpc",
  "sap btp (business technology platform)": "btp",
  "sap integration suite": "btp-integration",
  "sap extension suite": "btp-extension",
  "sap hana": "hana",
  "sap hana cloud": "hana-cloud",
  "sap pi/po (process integration/orchestration)": "pi-po",
  "sap cloud platform integration (cpi)": "cpi",
  "sap solution manager": "solman",
  "sap landscape management": "lms",
  "sap is-retail": "is-retail",
  "sap is-utilities": "is-utilities",
  "sap banking services": "is-banking",
  "sap insurance": "is-insurance",
  "sap healthcare": "is-healthcare",
  "sap oil & gas": "is-oil-gas",
  "sap public sector": "is-public-sector",
  "sap s/4hana for high-tech": "is-hls",
  "sap ppm (portfolio & project management)": "ppm",
  "sap ps (project system)": "ps",
  "sap cpq (configure price quote)": "cpq",
  "sap revenue cloud": "revenue-cloud",
  "sap eam (enterprise asset management)": "eam",
  "sap iam (investment & asset mgmt)": "iam",
  "sap sustainability footprint mgmt": "sustainability",
  "sap green ledger": "climate21",
  "sap intelligent rpa": "irpa",
  "sap conversational ai": "conversational-ai",
  "sap datasphere": "datasphere",
  "sap ai core": "ai-core",
  "sap ai launchpad": "ai-launchpad",
};

export function nameToId(productName: string): string {
  return NAME_TO_ID[productName.toLowerCase()] ?? productName.toLowerCase().replace(/[^a-z0-9]/g, "-");
}

export function getProductData(productId: string): ProductData {
  return PRODUCT_DB[productId] ?? PRODUCT_DB[PARENT_MAP[productId] ?? ""] ?? {};
}
