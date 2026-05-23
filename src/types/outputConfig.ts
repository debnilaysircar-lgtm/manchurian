export type ColorTheme = "sapBlue" | "midnight" | "slate" | "forest" | "executive";
export type OutputFont = "Calibri" | "Arial" | "Tahoma" | "Georgia";
export type ContentDensity = "compact" | "standard" | "expanded";
export type AITone = "strategic" | "technical" | "concise";
export type ConfidentialityLabel = "CONFIDENTIAL" | "INTERNAL USE ONLY" | "DRAFT" | "CLIENT FACING" | "";

export interface SlideToggles {
  title: boolean;
  products: boolean;
  landscape: boolean;
  scope: boolean;
  raci: boolean;
  dependencies: boolean;
  assumptions: boolean;
  resources: boolean;
  timeline: boolean;
  ams: boolean;
  clientContext: boolean;
  serviceCatalog: boolean;
  commercial: boolean;
  aiApproach: boolean;
  aiCSF: boolean;
  aiRisks: boolean;
}

export interface OutputConfig {
  theme: ColorTheme;
  font: OutputFont;
  density: ContentDensity;
  aiTone: AITone;
  confidentialityLabel: ConfidentialityLabel;
  slides: SlideToggles;
  showSlideNumbers: boolean;
  companyLogoText: string;
}

export const DEFAULT_CONFIG: OutputConfig = {
  theme: "sapBlue",
  font: "Calibri",
  density: "standard",
  aiTone: "strategic",
  confidentialityLabel: "CONFIDENTIAL",
  slides: {
    title: true,
    products: true,
    landscape: true,
    scope: true,
    raci: true,
    dependencies: true,
    assumptions: true,
    resources: true,
    timeline: true,
    ams: true,
    clientContext: true,
    serviceCatalog: true,
    commercial: true,
    aiApproach: true,
    aiCSF: true,
    aiRisks: true,
  },
  showSlideNumbers: true,
  companyLogoText: "SAP",
};

// Color palette per theme
export const THEME_PALETTES: Record<ColorTheme, {
  primary: string;
  dark: string;
  light: string;
  accent: string;
  label: string;
  preview: string; // css gradient for UI
}> = {
  sapBlue: {
    primary: "7900BF",
    dark: "0A1B3D",
    light: "F3F5FB",
    accent: "C7A26A",
    label: "Accenture",
    preview: "linear-gradient(135deg, #0A1B3D 0%, #7900BF 100%)",
  },
  midnight: {
    primary: "1A56DB",
    dark: "0D1B3E",
    light: "EEF2FF",
    accent: "64B5F6",
    label: "Midnight Navy",
    preview: "linear-gradient(135deg, #0D1B3E 0%, #1A56DB 100%)",
  },
  slate: {
    primary: "4B5563",
    dark: "111827",
    light: "F9FAFB",
    accent: "6366F1",
    label: "Corporate Slate",
    preview: "linear-gradient(135deg, #111827 0%, #4B5563 100%)",
  },
  forest: {
    primary: "059669",
    dark: "064E3B",
    light: "ECFDF5",
    accent: "F59E0B",
    label: "Forest Green",
    preview: "linear-gradient(135deg, #064E3B 0%, #059669 100%)",
  },
  executive: {
    primary: "7C3AED",
    dark: "2E1065",
    light: "F5F3FF",
    accent: "C4B5FD",
    label: "Executive Purple",
    preview: "linear-gradient(135deg, #2E1065 0%, #7C3AED 100%)",
  },
};

// Density modifiers
export const DENSITY_SETTINGS: Record<ContentDensity, {
  headerFontSize: number;
  bodyFontSize: number;
  rowHeight: number;
  cardGap: number;
  label: string;
}> = {
  compact: {
    headerFontSize: 19,
    bodyFontSize: 8,
    rowHeight: 0.30,
    cardGap: 0.08,
    label: "Compact",
  },
  standard: {
    headerFontSize: 22,
    bodyFontSize: 9.5,
    rowHeight: 0.36,
    cardGap: 0.12,
    label: "Standard",
  },
  expanded: {
    headerFontSize: 24,
    bodyFontSize: 11,
    rowHeight: 0.44,
    cardGap: 0.18,
    label: "Expanded",
  },
};
