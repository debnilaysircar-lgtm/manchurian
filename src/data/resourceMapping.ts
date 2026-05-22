import type { ResourceEntry } from "../utils/generatePptx";

// Standard phase allocation profiles (percent per phase)
const PROFILES = {
  pm:         [100, 100, 100, 100, 100, 100],
  architect:  [ 80, 100,  80,  60, 100,  50],
  functional: [ 50, 100, 100,  80,  80,  50],
  developer:  [ 20,  50, 100,  80,  60,  30],
  basis:      [ 80,  50,  80,  50, 100,  60],
  testing:    [ 20,  40,  60, 100,  80,  40],
  migration:  [ 40,  60, 100,  80, 100,  20],
  change:     [ 60,  80,  60,  80, 100,  80],
  integration:[ 20,  60, 100,  80,  60,  20],
  client:     [ 60, 100,  40,  80, 100,  30],
  security:   [ 30,  60,  80,  60,  60,  20],
  analytics:  [ 20,  60, 100,  70,  40,  20],
};

const PHASES = ["Prep", "Blueprint", "Realization", "Testing", "Cutover", "Hypercare"];

function toAllocations(profile: number[]): ResourceEntry["allocations"] {
  return PHASES.map((phase, i) => ({ phase, percent: profile[i] }));
}

function r(role: string, workstream: string, profileKey: keyof typeof PROFILES, type: ResourceEntry["type"] = "Consultant"): ResourceEntry {
  return { role, workstream, type, allocations: toAllocations(PROFILES[profileKey]) };
}

// Always-present resources regardless of product selection
const CORE_RESOURCES: ResourceEntry[] = [
  r("Project Manager",              "Project Mgmt",    "pm",        "Both"),
  r("SAP Basis Administrator",      "Technical",       "basis",     "Consultant"),
  r("Data Migration Lead",          "Data",            "migration", "Consultant"),
  r("Testing / QA Lead",            "Quality",         "testing",   "Consultant"),
  r("Change Management Lead",       "Change Mgmt",     "change",    "Client"),
  r("Business Process Owner",       "Business",        "client",    "Client"),
];

// Product-specific resources (keyed by product id)
const PRODUCT_RESOURCE_MAP: Record<string, ResourceEntry[]> = {
  "s4hana": [
    r("S/4HANA Solution Architect",   "ERP",         "architect"),
    r("FI/CO Functional Consultant",  "Finance",     "functional"),
    r("MM/PP Functional Consultant",  "Logistics",   "functional"),
    r("SD/CS Functional Consultant",  "Sales",       "functional"),
    r("ABAP Developer",               "Technical",   "developer"),
    r("Security & Auth Consultant",   "Security",    "security"),
  ],
  "s4hana-cloud": [
    r("S/4HANA Cloud Solution Architect", "ERP",     "architect"),
    r("FI/CO Functional Consultant",  "Finance",     "functional"),
    r("MM Functional Consultant",     "Logistics",   "functional"),
    r("SD Functional Consultant",     "Sales",       "functional"),
    r("BTP Extension Developer",      "Technical",   "developer"),
  ],
  "ecc": [
    r("SAP ECC Solution Architect",   "ERP",         "architect"),
    r("FI/CO Functional Consultant",  "Finance",     "functional"),
    r("MM Functional Consultant",     "Logistics",   "functional"),
    r("SD Functional Consultant",     "Sales",       "functional"),
    r("ABAP Developer",               "Technical",   "developer"),
  ],
  "successfactors": [
    r("SuccessFactors HCM Architect", "HCM",         "architect"),
    r("Employee Central Consultant",  "HCM",         "functional"),
    r("HR Process Expert",            "HCM",         "client",    "Client"),
  ],
  "sf-ec": [
    r("Employee Central Consultant",  "HCM",         "functional"),
    r("Payroll Integration Specialist","HCM",         "integration"),
  ],
  "sf-ec-payroll": [
    r("EC Payroll Consultant",        "Payroll",     "functional"),
    r("Payroll Testing Specialist",   "Payroll",     "testing"),
  ],
  "sf-recruiting": [
    r("SuccessFactors Recruiting Consultant", "Talent", "functional"),
  ],
  "sf-onboarding": [
    r("SuccessFactors Onboarding Consultant", "Talent", "functional"),
  ],
  "sf-lms": [
    r("LMS Functional Consultant",    "Learning",    "functional"),
    r("Content Migration Specialist", "Learning",    "migration"),
  ],
  "sf-performance": [
    r("Performance & Goals Consultant","Talent",     "functional"),
  ],
  "sf-compensation": [
    r("Compensation Functional Consultant","Talent", "functional"),
  ],
  "sf-succession": [
    r("Succession Planning Consultant","Talent",     "functional"),
  ],
  "hcm": [
    r("SAP HCM Solution Architect",   "HCM",         "architect"),
    r("Payroll Functional Consultant","Payroll",      "functional"),
    r("HR Functional Consultant",     "HCM",         "functional"),
  ],
  "ariba": [
    r("SAP Ariba Solution Architect", "Procurement", "architect"),
    r("Ariba Procurement Consultant", "Procurement", "functional"),
    r("Ariba Network Specialist",     "Procurement", "integration"),
  ],
  "ariba-sourcing": [
    r("Ariba Sourcing Consultant",    "Procurement", "functional"),
  ],
  "ariba-contracts": [
    r("Ariba Contracts Consultant",   "Procurement", "functional"),
  ],
  "ariba-buying": [
    r("Ariba Buying & Invoicing Consultant","Procurement","functional"),
    r("P2P Integration Developer",    "Integration", "integration"),
  ],
  "fieldglass": [
    r("Fieldglass VMS Consultant",    "Procurement", "functional"),
    r("External Workforce Manager",   "Procurement", "client",    "Client"),
  ],
  "ibp": [
    r("SAP IBP Solution Architect",   "Supply Chain","architect"),
    r("Demand Planning Consultant",   "Supply Chain","functional"),
    r("Supply Planning Consultant",   "Supply Chain","functional"),
  ],
  "ewm": [
    r("SAP EWM Functional Consultant","Warehouse",   "functional"),
    r("Warehouse Operations Lead",    "Warehouse",   "client",    "Client"),
  ],
  "tm": [
    r("SAP TM Functional Consultant", "Transport",   "functional"),
  ],
  "concur": [
    r("SAP Concur Solution Architect","T&E",         "architect"),
    r("Concur T&E Functional Consultant","T&E",      "functional"),
    r("Finance Integration Developer","Integration", "integration"),
  ],
  "concur-travel": [
    r("Concur Travel Consultant",     "T&E",         "functional"),
  ],
  "concur-expense": [
    r("Concur Expense Consultant",    "T&E",         "functional"),
  ],
  "concur-invoice": [
    r("Concur Invoice Consultant",    "Finance",     "functional"),
    r("AP Integration Developer",     "Integration", "integration"),
  ],
  "grc": [
    r("SAP GRC Solution Architect",   "Security",    "architect"),
    r("GRC Access Control Consultant","Security",    "functional"),
    r("Security & Auth Consultant",   "Security",    "security"),
  ],
  "btp": [
    r("SAP BTP Architect",            "Platform",    "architect"),
    r("BTP Integration Developer",    "Integration", "integration"),
    r("BTP Extension Developer",      "Platform",    "developer"),
  ],
  "btp-integration": [
    r("SAP Integration Suite Architect","Integration","architect"),
    r("iFlow / API Developer",        "Integration", "integration"),
  ],
  "cpi": [
    r("SAP CPI Integration Developer","Integration", "integration"),
    r("API Management Consultant",    "Integration", "functional"),
  ],
  "pi-po": [
    r("SAP PI/PO Integration Developer","Integration","integration"),
  ],
  "hana": [
    r("SAP HANA Database Admin",      "Technical",   "basis"),
    r("HANA Modelling Developer",     "Analytics",   "developer"),
  ],
  "hana-cloud": [
    r("SAP HANA Cloud Admin",         "Platform",    "basis"),
  ],
  "ac": [
    r("SAP Analytics Cloud Architect","Analytics",   "architect"),
    r("SAP Analytics Consultant",     "Analytics",   "analytics"),
    r("Data Modelling Specialist",    "Analytics",   "analytics"),
  ],
  "bw4hana": [
    r("SAP BW/4HANA Architect",       "Analytics",   "architect"),
    r("BW Data Modeller",             "Analytics",   "analytics"),
    r("ETL / Transformation Developer","Analytics",  "developer"),
  ],
  "bw": [
    r("SAP BW Architect",             "Analytics",   "architect"),
    r("BW Data Modeller",             "Analytics",   "analytics"),
  ],
  "bpc": [
    r("SAP BPC Functional Consultant","Finance",     "functional"),
    r("BPC Planning Specialist",      "Finance",     "analytics"),
  ],
  "datasphere": [
    r("SAP Datasphere Architect",     "Analytics",   "architect"),
    r("Data Fabric Developer",        "Analytics",   "developer"),
  ],
  "cx-sales": [
    r("SAP Sales Cloud Consultant",   "CX",          "functional"),
    r("CRM Integration Developer",    "CX",          "integration"),
  ],
  "cx-service": [
    r("SAP Service Cloud Consultant", "CX",          "functional"),
  ],
  "cx-marketing": [
    r("SAP Marketing Cloud Consultant","CX",         "functional"),
  ],
  "cx-commerce": [
    r("SAP Commerce Cloud Architect", "CX",          "architect"),
    r("Commerce Front-end Developer", "CX",          "developer"),
    r("OCC API Developer",            "CX",          "integration"),
  ],
  "cx-data": [
    r("Customer Data Cloud Consultant","CX",         "functional"),
  ],
  "crm": [
    r("SAP CRM Solution Architect",   "CX",          "architect"),
    r("CRM Functional Consultant",    "CX",          "functional"),
  ],
  "solman": [
    r("SAP Solution Manager Admin",   "Platform",    "basis"),
  ],
  "ppm": [
    r("SAP PPM Functional Consultant","Project Mgmt","functional"),
  ],
  "ps": [
    r("SAP PS Functional Consultant", "Project Mgmt","functional"),
  ],
  "eam": [
    r("SAP EAM / PM Consultant",      "Assets",      "functional"),
  ],
  "sustainability": [
    r("SAP Sustainability Consultant","Sustainability","functional"),
  ],
  "irpa": [
    r("SAP iRPA Developer",           "Automation",  "developer"),
    r("RPA Process Designer",         "Automation",  "functional"),
  ],
  "ai-core": [
    r("SAP AI Core Engineer",         "AI/ML",       "developer"),
  ],
  "revenue-cloud": [
    r("Revenue Cloud Consultant",     "Finance",     "functional"),
  ],
  "cpq": [
    r("CPQ Solution Consultant",      "Sales",       "functional"),
  ],
};

/**
 * Generates a deduplicated list of resource entries based on selected product IDs.
 * Core resources are always included. Product-specific resources are added per product.
 */
export function generateResourcesFromProducts(productIds: string[]): ResourceEntry[] {
  const seen = new Set<string>();
  const result: ResourceEntry[] = [];

  function add(entry: ResourceEntry) {
    if (!seen.has(entry.role)) {
      seen.add(entry.role);
      result.push(entry);
    }
  }

  CORE_RESOURCES.forEach(add);

  productIds.forEach(id => {
    const mapped = PRODUCT_RESOURCE_MAP[id];
    if (mapped) mapped.forEach(add);
  });

  return result;
}

export const PHASE_LABELS = PHASES;
