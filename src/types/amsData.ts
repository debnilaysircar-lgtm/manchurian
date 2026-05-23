export type SupportHours = "8x5" | "12x5" | "16x5" | "24x5" | "24x7";
export type SupportModel = "Dedicated" | "Shared Pool" | "Hybrid" | "Self-Service";
export type ReviewFrequency = "Weekly" | "Bi-weekly" | "Monthly" | "Quarterly";
export type SLATime = "15 min" | "30 min" | "1 hr" | "2 hr" | "4 hr" | "8 hr" | "1 day" | "2 days" | "5 days";
export type Availability = "99%" | "99.5%" | "99.9%" | "99.95%";
export type TicketVolume = "<100" | "100–500" | "500–1k" | "1k–5k" | "5k+";
export type TxVolume = "<1M" | "1–5M" | "5–10M" | "10M+";
export type ContractDuration = "6 months" | "12 months" | "24 months" | "36 months" | "Custom";

export interface AMSData {
  // Volume & users
  totalUsers: string;
  namedUsers: string;
  concurrentUsers: string;
  txVolume: TxVolume;

  // Support model
  supportModel: SupportModel;
  supportHours: SupportHours;
  supportLanguages: string;
  onshorePercent: string;
  offshorePercent: string;

  // SLA targets
  slaP1: SLATime;
  slaP2: SLATime;
  slaP3: SLATime;
  slaP4: SLATime;
  availability: Availability;

  // Service scope
  monthlyTickets: TicketVolume;
  monthlyChanges: string;
  hypercareDuration: string;
  trainingHours: string;
  contractDuration: ContractDuration;

  // Escalation
  dedicatedContacts: string;
  escalationPath: string;
  reviewFrequency: ReviewFrequency;

  // Additional notes
  exclusions: string;
  additionalNotes: string;
}

export const DEFAULT_AMS: AMSData = {
  totalUsers: "",
  namedUsers: "",
  concurrentUsers: "",
  txVolume: "1–5M",

  supportModel: "Hybrid",
  supportHours: "24x7",
  supportLanguages: "English",
  onshorePercent: "30",
  offshorePercent: "70",

  slaP1: "1 hr",
  slaP2: "4 hr",
  slaP3: "1 day",
  slaP4: "2 days",
  availability: "99.9%",

  monthlyTickets: "100–500",
  monthlyChanges: "",
  hypercareDuration: "4",
  trainingHours: "",
  contractDuration: "12 months",

  dedicatedContacts: "",
  escalationPath: "L1 → L2 → L3 → SAP Support",
  reviewFrequency: "Monthly",

  exclusions: "",
  additionalNotes: "",
};
