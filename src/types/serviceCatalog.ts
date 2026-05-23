export type ServiceTier = "Standard" | "Enhanced" | "Premium";
export type ServiceCategory =
  | "Incident Management"
  | "Change Management"
  | "Problem Management"
  | "Release Management"
  | "Monitoring & Alerting"
  | "Performance Management"
  | "Security & Compliance"
  | "User Administration"
  | "Data Management"
  | "Reporting & Analytics"
  | "Integration Support"
  | "Training & Knowledge Transfer"
  | "Continuous Improvement";

export interface ServiceCatalogEntry {
  id: string;
  category: ServiceCategory;
  serviceName: string;
  description: string;
  included: boolean;
  tier: ServiceTier;
  slaTarget: string;
  deliverable: string;
  frequency: string;
}
