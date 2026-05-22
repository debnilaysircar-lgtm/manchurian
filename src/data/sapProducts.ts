export interface SAPProduct {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const SAP_PRODUCTS: SAPProduct[] = [
  // ERP / Core Finance
  { id: "s4hana", name: "SAP S/4HANA", category: "ERP", description: "Next-generation ERP suite built on SAP HANA" },
  { id: "s4hana-cloud", name: "SAP S/4HANA Cloud", category: "ERP", description: "Cloud ERP for intelligent enterprises" },
  { id: "ecc", name: "SAP ECC (ERP Central Component)", category: "ERP", description: "Legacy SAP ERP platform" },
  { id: "bw4hana", name: "SAP BW/4HANA", category: "Analytics", description: "Data warehousing solution on HANA" },
  { id: "bw", name: "SAP BW (Business Warehouse)", category: "Analytics", description: "Business intelligence and data warehousing" },

  // CRM & Customer Experience
  { id: "cx-sales", name: "SAP Sales Cloud", category: "CX / CRM", description: "Cloud-based CRM for sales teams" },
  { id: "cx-service", name: "SAP Service Cloud", category: "CX / CRM", description: "Customer service and support platform" },
  { id: "cx-marketing", name: "SAP Marketing Cloud", category: "CX / CRM", description: "Marketing automation and personalization" },
  { id: "cx-commerce", name: "SAP Commerce Cloud", category: "CX / CRM", description: "Omnichannel commerce platform" },
  { id: "cx-data", name: "SAP Customer Data Cloud", category: "CX / CRM", description: "Identity, consent, and customer data management" },
  { id: "crm", name: "SAP CRM (On-Premise)", category: "CX / CRM", description: "On-premise customer relationship management" },

  // HR & Human Capital Management
  { id: "successfactors", name: "SAP SuccessFactors", category: "HCM", description: "Cloud HCM suite for HR management" },
  { id: "sf-recruiting", name: "SAP SuccessFactors Recruiting", category: "HCM", description: "End-to-end talent acquisition" },
  { id: "sf-onboarding", name: "SAP SuccessFactors Onboarding", category: "HCM", description: "Employee onboarding experience" },
  { id: "sf-lms", name: "SAP SuccessFactors Learning", category: "HCM", description: "Learning management system" },
  { id: "sf-performance", name: "SAP SuccessFactors Performance & Goals", category: "HCM", description: "Performance management and goal setting" },
  { id: "sf-compensation", name: "SAP SuccessFactors Compensation", category: "HCM", description: "Compensation planning and management" },
  { id: "sf-succession", name: "SAP SuccessFactors Succession & Development", category: "HCM", description: "Succession planning and career development" },
  { id: "sf-ec", name: "SAP SuccessFactors Employee Central", category: "HCM", description: "Core HR and payroll system of record" },
  { id: "sf-ec-payroll", name: "SAP SuccessFactors Employee Central Payroll", category: "HCM", description: "Cloud payroll solution" },
  { id: "hcm", name: "SAP HCM (On-Premise)", category: "HCM", description: "On-premise human capital management" },

  // Supply Chain & Procurement
  { id: "ariba", name: "SAP Ariba", category: "Procurement", description: "Procurement and supply chain collaboration" },
  { id: "ariba-sourcing", name: "SAP Ariba Sourcing", category: "Procurement", description: "Strategic sourcing and supplier management" },
  { id: "ariba-contracts", name: "SAP Ariba Contracts", category: "Procurement", description: "Contract lifecycle management" },
  { id: "ariba-buying", name: "SAP Ariba Buying & Invoicing", category: "Procurement", description: "Purchase-to-pay automation" },
  { id: "fieldglass", name: "SAP Fieldglass", category: "Procurement", description: "Vendor management system for external workforce" },
  { id: "ibp", name: "SAP IBP (Integrated Business Planning)", category: "Supply Chain", description: "Supply chain planning and optimization" },
  { id: "apo", name: "SAP APO (Advanced Planning & Optimization)", category: "Supply Chain", description: "Legacy supply chain planning" },
  { id: "ewm", name: "SAP EWM (Extended Warehouse Management)", category: "Supply Chain", description: "Advanced warehouse management" },
  { id: "tm", name: "SAP TM (Transportation Management)", category: "Supply Chain", description: "End-to-end transportation planning" },
  { id: "slm", name: "SAP SLM (Supplier Lifecycle Management)", category: "Procurement", description: "Supplier qualification and lifecycle management" },

  // Finance & Accounting
  { id: "concur", name: "SAP Concur", category: "Finance", description: "Travel and expense management" },
  { id: "concur-travel", name: "SAP Concur Travel", category: "Finance", description: "Corporate travel booking and management" },
  { id: "concur-expense", name: "SAP Concur Expense", category: "Finance", description: "Expense reporting and management" },
  { id: "concur-invoice", name: "SAP Concur Invoice", category: "Finance", description: "Invoice processing and accounts payable" },
  { id: "grc", name: "SAP GRC (Governance, Risk & Compliance)", category: "Finance", description: "Risk management and compliance" },
  { id: "fcc", name: "SAP Financial Closing Cockpit", category: "Finance", description: "Period-end closing management" },
  { id: "ac", name: "SAP Analytics Cloud", category: "Analytics", description: "BI, planning, and predictive analytics" },
  { id: "bpc", name: "SAP BPC (Business Planning & Consolidation)", category: "Finance", description: "Financial planning and consolidation" },

  // Technology & Platform
  { id: "btp", name: "SAP BTP (Business Technology Platform)", category: "Platform", description: "Integration, extension, and data platform" },
  { id: "btp-integration", name: "SAP Integration Suite", category: "Platform", description: "API management and integration middleware" },
  { id: "btp-extension", name: "SAP Extension Suite", category: "Platform", description: "Low-code/no-code app development" },
  { id: "hana", name: "SAP HANA", category: "Database", description: "In-memory database platform" },
  { id: "hana-cloud", name: "SAP HANA Cloud", category: "Database", description: "Cloud-native in-memory database" },
  { id: "pi-po", name: "SAP PI/PO (Process Integration/Orchestration)", category: "Integration", description: "On-premise middleware for SAP integration" },
  { id: "cpi", name: "SAP Cloud Platform Integration (CPI)", category: "Integration", description: "Cloud-based integration service" },
  { id: "solman", name: "SAP Solution Manager", category: "Platform", description: "Application lifecycle management" },
  { id: "lms", name: "SAP Landscape Management", category: "Platform", description: "System landscape management" },

  // Industry Solutions
  { id: "is-retail", name: "SAP IS-Retail", category: "Industry", description: "SAP for retail industry" },
  { id: "is-utilities", name: "SAP IS-Utilities", category: "Industry", description: "SAP for utilities industry" },
  { id: "is-banking", name: "SAP Banking Services", category: "Industry", description: "Core banking and financial services" },
  { id: "is-insurance", name: "SAP Insurance", category: "Industry", description: "Insurance industry solution" },
  { id: "is-healthcare", name: "SAP Healthcare", category: "Industry", description: "Healthcare and life sciences" },
  { id: "is-oil-gas", name: "SAP Oil & Gas", category: "Industry", description: "Oil and gas industry solution" },
  { id: "is-public-sector", name: "SAP Public Sector", category: "Industry", description: "Government and public services" },
  { id: "is-hls", name: "SAP S/4HANA for High-Tech", category: "Industry", description: "High-tech industry solution" },

  // Project Management & PPM
  { id: "ppm", name: "SAP PPM (Portfolio & Project Management)", category: "Project Mgmt", description: "Portfolio and project lifecycle management" },
  { id: "ps", name: "SAP PS (Project System)", category: "Project Mgmt", description: "Project planning and execution" },
  { id: "cpq", name: "SAP CPQ (Configure Price Quote)", category: "Sales", description: "Product configuration and quoting" },
  { id: "revenue-cloud", name: "SAP Revenue Cloud", category: "Finance", description: "Subscription and revenue management" },

  // Asset Management
  { id: "eam", name: "SAP EAM (Enterprise Asset Management)", category: "Assets", description: "Plant maintenance and asset management" },
  { id: "iam", name: "SAP IAM (Investment & Asset Mgmt)", category: "Assets", description: "Capital investment planning" },

  // Sustainability
  { id: "sustainability", name: "SAP Sustainability Footprint Mgmt", category: "Sustainability", description: "Carbon footprint tracking and reporting" },
  { id: "climate21", name: "SAP Green Ledger", category: "Sustainability", description: "Environmental accounting and ESG reporting" },

  // Intelligent Technologies
  { id: "irpa", name: "SAP Intelligent RPA", category: "Automation", description: "Robotic process automation" },
  { id: "conversational-ai", name: "SAP Conversational AI", category: "AI/ML", description: "Chatbot and virtual assistant platform" },
  { id: "datasphere", name: "SAP Datasphere", category: "Analytics", description: "Business data fabric and data management" },
  { id: "ai-core", name: "SAP AI Core", category: "AI/ML", description: "Standardized AI model operations" },
  { id: "ai-launchpad", name: "SAP AI Launchpad", category: "AI/ML", description: "AI lifecycle management" },
];

export const SAP_CATEGORIES = [...new Set(SAP_PRODUCTS.map(p => p.category))].sort();

export function searchSAPProducts(query: string): SAPProduct[] {
  if (!query.trim()) return SAP_PRODUCTS.slice(0, 12);
  const q = query.toLowerCase();
  return SAP_PRODUCTS.filter(
    p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
  ).slice(0, 15);
}
