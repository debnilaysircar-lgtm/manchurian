import PptxGenJS from "pptxgenjs";
import type { SAPProduct } from "../data/sapProducts";
import type { BestPracticesResponse } from "./fetchBestPractices";
import type { OutputConfig } from "../types/outputConfig";
import { THEME_PALETTES, DENSITY_SETTINGS } from "../types/outputConfig";
import type { AMSData } from "../types/amsData";
import type { ServiceCatalogEntry } from "../types/serviceCatalog";

export interface SystemEnvironment {
  name: string;
  enabled: boolean;
  description: string;
}

export interface RACIEntry {
  activity: string;
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
}

export interface PhaseAllocation {
  phase: string;
  percent: number; // 0–100
}

export interface ResourceEntry {
  role: string;
  workstream: string;
  type: "Consultant" | "Client" | "Both";
  allocations: PhaseAllocation[];
}

export interface FormData {
  projectName: string;
  client: string;
  projectManager: string;
  selectedProducts: SAPProduct[];
  systems: SystemEnvironment[];
  scopeItems: string[];
  raciEntries: RACIEntry[];
  dependencies: string[];
  assumptions: string[];
  resources: ResourceEntry[];
  preparedBy: string;
  version: string;
  bestPractices?: BestPracticesResponse;
  outputConfig?: OutputConfig;
  amsData?: AMSData;
  clientContext?: string;
  serviceCatalog?: ServiceCatalogEntry[];
  commercialShape?: CommercialShape;
}

export interface CommercialShape {
  engagementModel: string;
  currency: string;
  totalValue: string;
  paymentTerms: string;
  paymentSchedule: string;
  expensePolicy: string;
  warrantyPeriod: string;
  governingLaw: string;
  noticeperiod: string;
  penaltyClauses: string;
  additionalTerms: string;
}

// Derived at generation time from OutputConfig
let COLORS = {
  sapBlue: "0070F2",
  sapDarkBlue: "003D73",
  sapLightBlue: "E8F4FD",
  accentGold: "F0AB00",
  white: "FFFFFF",
  lightGray: "F5F5F5",
  medGray: "E0E0E0",
  darkGray: "333333",
  textGray: "555555",
  rowAlt: "EEF4FC",
  green: "107E3E",
  orange: "E9730C",
  purple: "6A2C8E",
  teal: "0F7B8C",
};

let FONT = "Calibri";
let DENSITY = DENSITY_SETTINGS["standard"];
let CONFIDENTIALITY = "CONFIDENTIAL";
let SHOW_SLIDE_NUMBERS = true;
let LOGO_TEXT = "SAP";

function applyConfig(cfg?: OutputConfig) {
  const theme = cfg?.theme ?? "sapBlue";
  const palette = THEME_PALETTES[theme];
  COLORS = {
    ...COLORS,
    sapBlue: palette.primary,
    sapDarkBlue: palette.dark,
    sapLightBlue: palette.light,
    accentGold: palette.accent,
    rowAlt: palette.light,
  };
  FONT = cfg?.font ?? "Calibri";
  DENSITY = DENSITY_SETTINGS[cfg?.density ?? "standard"];
  CONFIDENTIALITY = cfg?.confidentialityLabel ?? "CONFIDENTIAL";
  SHOW_SLIDE_NUMBERS = cfg?.showSlideNumbers ?? true;
  LOGO_TEXT = cfg?.companyLogoText || "SAP";
}

let _slideNumber = 0;

function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.9, fill: { color: COLORS.sapDarkBlue } });
  slide.addShape("rect", { x: 0, y: 0.9, w: "100%", h: 0.06, fill: { color: COLORS.sapBlue } });

  slide.addText(title, {
    x: 0.35, y: 0.12, w: 8.5, h: 0.65,
    fontSize: DENSITY.headerFontSize, bold: true, color: COLORS.white, fontFace: FONT,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.6, w: 8.5, h: 0.35,
      fontSize: 11, color: COLORS.accentGold, fontFace: FONT, italic: true,
    });
  }
}

function addSlideFooter(slide: PptxGenJS.Slide, data: FormData) {
  _slideNumber++;
  slide.addShape("rect", { x: 0, y: 7.2, w: "100%", h: 0.3, fill: { color: COLORS.medGray } });
  slide.addText(`${data.projectName}  |  v${data.version}  |  Prepared by: ${data.preparedBy}`, {
    x: 0.3, y: 7.22, w: 7, h: 0.25,
    fontSize: 8, color: COLORS.textGray, fontFace: FONT,
  });
  const rightText = [
    CONFIDENTIALITY,
    SHOW_SLIDE_NUMBERS ? `  ${_slideNumber}` : "",
  ].filter(Boolean).join("  |  ");
  slide.addText(rightText, {
    x: 7.0, y: 7.22, w: 2.7, h: 0.25,
    fontSize: 8, color: COLORS.textGray, fontFace: FONT, align: "right",
  });
}

// ──────────────────────────────────────────────
// SLIDE 1 – Title
// ──────────────────────────────────────────────
function addTitleSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();

  // Full background
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.sapDarkBlue } });
  slide.addShape("rect", { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: COLORS.sapBlue } });
  slide.addShape("rect", { x: 0, y: 5.5, w: "100%", h: 2.0, fill: { color: "00213A" } });

  // Logo badge
  slide.addText(LOGO_TEXT, {
    x: 0.4, y: 0.3, w: 2, h: 0.6,
    fontSize: 36, bold: true, color: COLORS.accentGold, fontFace: FONT,
  });
  slide.addText("Solution Architecture", {
    x: 0.4, y: 0.85, w: 6, h: 0.4,
    fontSize: 14, color: COLORS.medGray, fontFace: FONT, italic: true,
  });

  // Main title
  slide.addText(data.projectName || "SAP Implementation Project", {
    x: 0.4, y: 1.6, w: 9.2, h: 1.4,
    fontSize: 36, bold: true, color: COLORS.white, fontFace: FONT,
  });

  slide.addText("Solution Design & Scope Document", {
    x: 0.4, y: 3.0, w: 9.2, h: 0.5,
    fontSize: 16, color: COLORS.accentGold, fontFace: FONT,
  });

  // Products chips
  const products = data.selectedProducts.slice(0, 6).map(p => p.name).join("   •   ");
  slide.addText(products, {
    x: 0.4, y: 3.7, w: 9.2, h: 0.4,
    fontSize: 10, color: COLORS.medGray, fontFace: FONT,
  });

  // Meta info
  slide.addText(`Client: ${data.client}`, { x: 0.4, y: 5.65, w: 4, h: 0.3, fontSize: 11, color: COLORS.medGray, fontFace: FONT });
  slide.addText(`Project Manager: ${data.projectManager}`, { x: 0.4, y: 5.95, w: 4, h: 0.3, fontSize: 11, color: COLORS.medGray, fontFace: FONT });
  slide.addText(`Prepared by: ${data.preparedBy}`, { x: 0.4, y: 6.25, w: 4, h: 0.3, fontSize: 11, color: COLORS.medGray, fontFace: FONT });
  slide.addText(`Version: ${data.version}`, { x: 5, y: 5.65, w: 4, h: 0.3, fontSize: 11, color: COLORS.medGray, fontFace: FONT });

  const enabledSystems = data.systems.filter(s => s.enabled).map(s => s.name).join("  →  ");
  slide.addText(`Environments: ${enabledSystems}`, { x: 5, y: 5.95, w: 4.5, h: 0.3, fontSize: 11, color: COLORS.medGray, fontFace: FONT });
}

// ──────────────────────────────────────────────
// SLIDE 2 – Executive Summary / Products Overview
// ──────────────────────────────────────────────
function addProductsSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "SAP Products in Scope", data.projectName);

  const products = data.selectedProducts;
  const cols = 2;
  const startY = 1.1;
  const cardH = 0.88;
  const cardW = 4.5;
  const gap = 0.12;

  products.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col === 0 ? 0.3 : 5.0;
    const y = startY + row * (cardH + gap);

    if (y + cardH > 7.1) return;

    // Card background
    const bgColor = col === 0 ? COLORS.sapLightBlue : COLORS.lightGray;
    slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: bgColor }, line: { color: COLORS.medGray, width: 0.5 }, rectRadius: 0.06 });

    // Category tag
    slide.addText(p.category.toUpperCase(), {
      x: x + 0.12, y: y + 0.07, w: cardW - 0.24, h: 0.2,
      fontSize: 7, bold: true, color: COLORS.sapBlue, fontFace: FONT,
    });

    slide.addText(p.name, {
      x: x + 0.12, y: y + 0.27, w: cardW - 0.24, h: 0.28,
      fontSize: 12, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT,
    });
    slide.addText(p.description, {
      x: x + 0.12, y: y + 0.54, w: cardW - 0.24, h: 0.28,
      fontSize: 9, color: COLORS.textGray, fontFace: FONT,
    });
  });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 3 – System Landscape
// ──────────────────────────────────────────────
function addLandscapeSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "System Landscape", "Deployment Architecture");

  const envColors: Record<string, string> = {
    Sandbox: COLORS.teal,
    Development: COLORS.green,
    Test: COLORS.orange,
    "Quality Assurance": COLORS.purple,
    "User Acceptance Testing": "8B4513",
    Production: COLORS.sapDarkBlue,
  };

  const enabled = data.systems.filter(s => s.enabled);
  const total = enabled.length;
  const boxW = total > 0 ? Math.min(1.8, (9.2 / total) - 0.15) : 1.8;
  const boxH = 3.5;
  const startX = 0.35 + (9.2 - (boxW + 0.2) * total + 0.2) / 2;
  const arrowY = 1.8 + boxH / 2;

  enabled.forEach((sys, i) => {
    const x = startX + i * (boxW + 0.2);
    const color = envColors[sys.name] || COLORS.sapBlue;

    // Box
    slide.addShape("roundRect", { x, y: 1.15, w: boxW, h: boxH, fill: { color }, line: { color: "FFFFFF", width: 0.5 }, rectRadius: 0.1 });

    // System name header
    slide.addText(sys.name, {
      x, y: 1.2, w: boxW, h: 0.4,
      fontSize: 10, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
    });

    // Description
    slide.addText(sys.description, {
      x: x + 0.07, y: 1.65, w: boxW - 0.14, h: 0.5,
      fontSize: 8, color: COLORS.white, fontFace: FONT, align: "center",
    });

    // Product list inside box
    const prodNames = data.selectedProducts.slice(0, 5).map(p => "• " + (p.name.length > 22 ? p.name.substring(0, 20) + "…" : p.name));
    slide.addText(prodNames.join("\n"), {
      x: x + 0.07, y: 2.2, w: boxW - 0.14, h: 2.2,
      fontSize: 7.5, color: COLORS.white, fontFace: FONT,
    });

    // Arrow between boxes
    if (i < total - 1) {
      slide.addShape("rect", { x: x + boxW, y: arrowY - 0.03, w: 0.18, h: 0.06, fill: { color: COLORS.sapBlue } });
    }
  });

  // Transport path label
  if (total > 1) {
    slide.addText("◀  Transport / Promotion Path  ▶", {
      x: 0.3, y: 5.0, w: 9.2, h: 0.3,
      fontSize: 9, color: COLORS.textGray, fontFace: FONT, align: "center", italic: true,
    });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 4 – Scope
// ──────────────────────────────────────────────
function addScopeSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "Project Scope", "In-Scope Deliverables");

  // Two-column layout: In Scope | Out of Scope
  const colW = 4.45;
  const colY = 1.05;

  // In Scope header
  slide.addShape("rect", { x: 0.3, y: colY, w: colW, h: 0.38, fill: { color: COLORS.green } });
  slide.addText("✔  IN SCOPE", { x: 0.3, y: colY, w: colW, h: 0.38, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

  // Out of Scope header
  slide.addShape("rect", { x: 5.05, y: colY, w: colW, h: 0.38, fill: { color: "C0392B" } });
  slide.addText("✖  OUT OF SCOPE", { x: 5.05, y: colY, w: colW, h: 0.38, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

  // In-scope items
  const inScopeItems = data.scopeItems.filter(Boolean);
  inScopeItems.forEach((item, i) => {
    const y = colY + 0.44 + i * 0.38;
    if (y > 6.8) return;
    const bg = i % 2 === 0 ? COLORS.lightGray : COLORS.white;
    slide.addShape("rect", { x: 0.3, y, w: colW, h: 0.36, fill: { color: bg } });
    slide.addText(`${i + 1}.  ${item}`, { x: 0.4, y: y + 0.04, w: colW - 0.2, h: 0.28, fontSize: 9.5, color: COLORS.darkGray, fontFace: FONT });
  });

  // Auto-generated out-of-scope (non-selected SAP products)
  const outItems = [
    "Custom development beyond agreed specifications",
    "Data migration from non-SAP legacy systems",
    "Third-party integrations not listed in scope",
    "End-user hardware provisioning",
    "Production support post go-live (unless contracted)",
    "Regulatory compliance advisory services",
  ];
  outItems.forEach((item, i) => {
    const y = colY + 0.44 + i * 0.38;
    if (y > 6.8) return;
    const bg = i % 2 === 0 ? COLORS.lightGray : COLORS.white;
    slide.addShape("rect", { x: 5.05, y, w: colW, h: 0.36, fill: { color: bg } });
    slide.addText(`${i + 1}.  ${item}`, { x: 5.15, y: y + 0.04, w: colW - 0.2, h: 0.28, fontSize: 9.5, color: COLORS.darkGray, fontFace: FONT });
  });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 5 – RACI Matrix
// ──────────────────────────────────────────────
function addRACISlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "RACI Matrix", "Roles & Responsibilities");

  // Legend
  const legend = [
    { code: "R", label: "Responsible", color: COLORS.green },
    { code: "A", label: "Accountable", color: COLORS.sapDarkBlue },
    { code: "C", label: "Consulted", color: COLORS.orange },
    { code: "I", label: "Informed", color: COLORS.textGray },
  ];
  legend.forEach((l, i) => {
    const x = 0.3 + i * 2.35;
    slide.addShape("roundRect", { x, y: 1.05, w: 0.28, h: 0.28, fill: { color: l.color }, rectRadius: 0.04 });
    slide.addText(l.code, { x, y: 1.05, w: 0.28, h: 0.28, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(`= ${l.label}`, { x: x + 0.31, y: 1.07, w: 1.9, h: 0.24, fontSize: 8.5, color: COLORS.textGray, fontFace: FONT });
  });

  // Table headers
  const headers = ["Activity / Deliverable", "Responsible", "Accountable", "Consulted", "Informed"];
  const colWidths = [3.3, 1.5, 1.5, 1.5, 1.5];
  const tableX = 0.25;
  const headerY = 1.45;
  let xPos = tableX;

  headers.forEach((h, i) => {
    slide.addShape("rect", { x: xPos, y: headerY, w: colWidths[i], h: 0.36, fill: { color: COLORS.sapDarkBlue } });
    slide.addText(h, { x: xPos + 0.05, y: headerY, w: colWidths[i] - 0.1, h: 0.36, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: i === 0 ? "left" : "center" });
    xPos += colWidths[i];
  });

  // RACI rows
  data.raciEntries.forEach((entry, i) => {
    const rowY = headerY + 0.36 + i * 0.38;
    if (rowY + 0.38 > 7.1) return;
    const rowBg = i % 2 === 0 ? COLORS.rowAlt : COLORS.white;
    const cells = [entry.activity, entry.responsible, entry.accountable, entry.consulted, entry.informed];
    let cx = tableX;

    cells.forEach((cell, ci) => {
      slide.addShape("rect", { x: cx, y: rowY, w: colWidths[ci], h: 0.36, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.3 } });

      if (ci === 0) {
        slide.addText(cell, { x: cx + 0.07, y: rowY + 0.04, w: colWidths[ci] - 0.14, h: 0.28, fontSize: 9, color: COLORS.darkGray, fontFace: FONT });
      } else {
        // Colored badge for RACI code
        const colorMap: Record<string, string> = { R: COLORS.green, A: COLORS.sapDarkBlue, C: COLORS.orange, I: COLORS.textGray };
        const code = cell.charAt(0).toUpperCase();
        if (colorMap[code] && cell.length <= 2) {
          slide.addShape("roundRect", { x: cx + colWidths[ci] / 2 - 0.15, y: rowY + 0.06, w: 0.3, h: 0.24, fill: { color: colorMap[code] }, rectRadius: 0.04 });
          slide.addText(code, { x: cx + colWidths[ci] / 2 - 0.15, y: rowY + 0.06, w: 0.3, h: 0.24, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
        } else {
          slide.addText(cell, { x: cx + 0.05, y: rowY + 0.04, w: colWidths[ci] - 0.1, h: 0.28, fontSize: 8.5, color: COLORS.darkGray, fontFace: FONT, align: "center" });
        }
      }
      cx += colWidths[ci];
    });
  });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 6 – Dependencies
// ──────────────────────────────────────────────
function addDependenciesSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "Dependencies", "Project & Technical Dependencies");

  const deps = data.dependencies.filter(Boolean);
  const iconColors = [COLORS.sapBlue, COLORS.orange, COLORS.green, COLORS.purple, COLORS.teal, COLORS.sapDarkBlue];

  deps.forEach((dep, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 0.3 : 5.05;
    const y = 1.15 + row * 0.9;

    if (y + 0.85 > 7.1) return;

    const color = iconColors[i % iconColors.length];

    slide.addShape("roundRect", { x, y, w: 4.45, h: 0.78, fill: { color: COLORS.lightGray }, line: { color: COLORS.medGray, width: 0.5 }, rectRadius: 0.07 });
    slide.addShape("roundRect", { x: x + 0.08, y: y + 0.1, w: 0.35, h: 0.58, fill: { color }, rectRadius: 0.04 });
    slide.addText(`${i + 1}`, { x: x + 0.08, y: y + 0.1, w: 0.35, h: 0.58, fontSize: 12, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(dep, { x: x + 0.52, y: y + 0.12, w: 3.85, h: 0.54, fontSize: 9.5, color: COLORS.darkGray, fontFace: FONT });
  });

  if (deps.length === 0) {
    slide.addText("No dependencies defined.", { x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 12, color: COLORS.textGray, fontFace: FONT, italic: true });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 7 – Assumptions
// ──────────────────────────────────────────────
function addAssumptionsSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "Assumptions & Constraints", "Project Assumptions");

  const assumptions = data.assumptions.filter(Boolean);

  assumptions.forEach((item, i) => {
    const y = 1.15 + i * 0.72;
    if (y + 0.65 > 7.1) return;

    slide.addShape("roundRect", { x: 0.3, y, w: 9.2, h: 0.62, fill: { color: i % 2 === 0 ? COLORS.sapLightBlue : COLORS.lightGray }, line: { color: COLORS.medGray, width: 0.3 }, rectRadius: 0.06 });

    // Bullet icon
    slide.addShape("ellipse", { x: 0.45, y: y + 0.2, w: 0.22, h: 0.22, fill: { color: COLORS.sapBlue } });
    slide.addText(`${i + 1}`, { x: 0.45, y: y + 0.2, w: 0.22, h: 0.22, fontSize: 8, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

    slide.addText(item, { x: 0.78, y: y + 0.1, w: 8.6, h: 0.42, fontSize: 10, color: COLORS.darkGray, fontFace: FONT });
  });

  if (assumptions.length === 0) {
    slide.addText("No assumptions defined.", { x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 12, color: COLORS.textGray, fontFace: FONT, italic: true });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 8 – Resource Loading
// ──────────────────────────────────────────────

/** Returns a hex fill colour based on allocation percentage (0–100) using a blue heatmap. */
function allocationColor(pct: number): string {
  if (pct === 0)       return "F2F2F2"; // empty – light grey
  if (pct <= 25)       return "D6E8FA"; // very light blue
  if (pct <= 50)       return "90C4F5"; // light-medium blue
  if (pct <= 75)       return "3D9BE9"; // medium blue
  return               "0070F2";        // full SAP blue
}

/** Text colour that contrasts with the heatmap background. */
function allocationTextColor(pct: number): string {
  return pct > 50 ? "FFFFFF" : "003D73";
}

function addResourceLoadingSlide(pptx: PptxGenJS, data: FormData) {
  const resources = data.resources.filter(r => r.role.trim());
  if (resources.length === 0) return;

  // Derive phases from the first resource entry (all entries share the same phase list)
  const phases = resources[0].allocations.map(a => a.phase);
  const phaseCount = phases.length;

  // Column layout: Role | Workstream | Type | ...phases
  const roleW      = 2.5;
  const wsW        = 1.2;
  const typeW      = 0.8;
  const phaseW     = (9.5 - roleW - wsW - typeW) / phaseCount;
  const tableX     = 0.25;
  const headerH    = 0.36;
  const rowH       = DENSITY.rowHeight;
  const startY     = 1.05;
  const maxRows    = Math.floor((7.0 - startY - headerH - 0.35) / rowH);
  const visResources = resources.slice(0, maxRows);

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Resource Loading Plan", "Effort Allocation by Phase (%)");

  // ── Column headers ──
  const headers = ["Resource / Role", "Workstream", "Type", ...phases];
  const colWidths = [roleW, wsW, typeW, ...Array(phaseCount).fill(phaseW)];
  let cx = tableX;

  headers.forEach((h, i) => {
    const isPhase = i >= 3;
    slide.addShape("rect", {
      x: cx, y: startY, w: colWidths[i], h: headerH,
      fill: { color: isPhase ? COLORS.sapBlue : COLORS.sapDarkBlue },
      line: { color: COLORS.white, width: 0.4 },
    });
    slide.addText(h, {
      x: cx + 0.04, y: startY, w: colWidths[i] - 0.08, h: headerH,
      fontSize: isPhase ? 8 : 8.5, bold: true, color: COLORS.white,
      fontFace: FONT, align: "center",
    });
    cx += colWidths[i];
  });

  // ── Resource rows ──
  const typeColors: Record<string, string> = {
    Consultant: COLORS.sapBlue,
    Client:     COLORS.green,
    Both:       COLORS.purple,
  };

  visResources.forEach((res, ri) => {
    const rowY   = startY + headerH + ri * rowH;
    const rowBg  = ri % 2 === 0 ? COLORS.rowAlt : COLORS.white;
    let rx = tableX;

    // Role
    slide.addShape("rect", { x: rx, y: rowY, w: roleW, h: rowH, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.25 } });
    slide.addText(res.role, { x: rx + 0.07, y: rowY + 0.04, w: roleW - 0.14, h: rowH - 0.08, fontSize: 8, color: COLORS.darkGray, fontFace: FONT });
    rx += roleW;

    // Workstream
    slide.addShape("rect", { x: rx, y: rowY, w: wsW, h: rowH, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.25 } });
    slide.addText(res.workstream, { x: rx + 0.04, y: rowY + 0.04, w: wsW - 0.08, h: rowH - 0.08, fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, align: "center" });
    rx += wsW;

    // Type badge
    slide.addShape("rect", { x: rx, y: rowY, w: typeW, h: rowH, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.25 } });
    const typeColor = typeColors[res.type] ?? COLORS.sapBlue;
    slide.addShape("roundRect", { x: rx + 0.05, y: rowY + 0.06, w: typeW - 0.1, h: rowH - 0.12, fill: { color: typeColor }, rectRadius: 0.04 });
    slide.addText(res.type, { x: rx + 0.05, y: rowY + 0.06, w: typeW - 0.1, h: rowH - 0.12, fontSize: 6.5, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    rx += typeW;

    // Phase allocation cells (heatmap)
    res.allocations.forEach(alloc => {
      const bg  = allocationColor(alloc.percent);
      const fg  = allocationTextColor(alloc.percent);
      const txt = alloc.percent > 0 ? `${alloc.percent}%` : "—";
      slide.addShape("rect", { x: rx, y: rowY, w: phaseW, h: rowH, fill: { color: bg }, line: { color: COLORS.white, width: 0.4 } });
      slide.addText(txt, { x: rx, y: rowY + 0.04, w: phaseW, h: rowH - 0.08, fontSize: 8, bold: alloc.percent > 0, color: fg, fontFace: FONT, align: "center" });
      rx += phaseW;
    });
  });

  // ── Summary / Total FTE row ──
  const summaryY = startY + headerH + visResources.length * rowH;
  if (summaryY + rowH < 7.1) {
    let sx = tableX;
    slide.addShape("rect", { x: sx, y: summaryY, w: roleW, h: rowH, fill: { color: COLORS.sapDarkBlue }, line: { color: COLORS.white, width: 0.4 } });
    slide.addText("Total FTE (est.)", { x: sx + 0.07, y: summaryY + 0.04, w: roleW - 0.14, h: rowH - 0.08, fontSize: 8, bold: true, color: COLORS.white, fontFace: FONT });
    sx += roleW;

    slide.addShape("rect", { x: sx, y: summaryY, w: wsW + typeW, h: rowH, fill: { color: COLORS.sapDarkBlue }, line: { color: COLORS.white, width: 0.4 } });
    sx += wsW + typeW;

    phases.forEach((_, pi) => {
      const total = visResources.reduce((sum, res) => sum + (res.allocations[pi]?.percent ?? 0), 0);
      const fte   = (total / 100).toFixed(1);
      const bg    = allocationColor(Math.min(100, total / visResources.length));
      slide.addShape("rect", { x: sx, y: summaryY, w: phaseW, h: rowH, fill: { color: bg }, line: { color: COLORS.white, width: 0.4 } });
      slide.addText(`${fte}`, { x: sx, y: summaryY + 0.04, w: phaseW, h: rowH - 0.08, fontSize: 8.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });
      sx += phaseW;
    });
  }

  // ── Legend ──
  const legendY = 6.75;
  const legend = [
    { label: "0%",       color: "F2F2F2", text: "003D73" },
    { label: "1–25%",    color: "D6E8FA", text: "003D73" },
    { label: "26–50%",   color: "90C4F5", text: "003D73" },
    { label: "51–75%",   color: "3D9BE9", text: "FFFFFF" },
    { label: "76–100%",  color: "0070F2", text: "FFFFFF" },
  ];
  slide.addText("Allocation key:", { x: 0.25, y: legendY, w: 1.3, h: 0.26, fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, italic: true });
  legend.forEach((l, i) => {
    const lx = 1.6 + i * 1.55;
    slide.addShape("roundRect", { x: lx, y: legendY + 0.02, w: 1.4, h: 0.22, fill: { color: l.color }, line: { color: COLORS.medGray, width: 0.3 }, rectRadius: 0.04 });
    slide.addText(l.label, { x: lx, y: legendY + 0.02, w: 1.4, h: 0.22, fontSize: 7, bold: true, color: l.text, fontFace: FONT, align: "center" });
  });

  if (resources.length > maxRows) {
    slide.addText(`* Showing first ${maxRows} of ${resources.length} resources`, {
      x: 0.25, y: summaryY + rowH + 0.05, w: 5, h: 0.2,
      fontSize: 7, color: COLORS.textGray, fontFace: FONT, italic: true,
    });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 9 – Timeline Overview
// ──────────────────────────────────────────────
function addTimelineSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "High-Level Timeline", "Project Phases & Milestones");

  const phases = [
    { name: "Project Preparation", icon: "📋", duration: "Wk 1–2", color: COLORS.teal },
    { name: "Blueprint / Fit-Gap", icon: "🔍", duration: "Wk 3–6", color: COLORS.sapBlue },
    { name: "Realization", icon: "⚙️", duration: "Wk 7–14", color: COLORS.orange },
    { name: "Testing", icon: "✅", duration: "Wk 15–18", color: COLORS.purple },
    { name: "Cutover & Go-Live", icon: "🚀", duration: "Wk 19–20", color: COLORS.green },
    { name: "Hypercare", icon: "🛡️", duration: "Wk 21–24", color: COLORS.sapDarkBlue },
  ];

  const totalW = 9.2;
  const boxW = totalW / phases.length - 0.06;
  const startX = 0.3;
  const lineY = 3.3;
  const boxY = 1.15;

  // Timeline connector line
  slide.addShape("rect", { x: startX, y: lineY + 0.6, w: totalW, h: 0.05, fill: { color: COLORS.medGray } });

  phases.forEach((phase, i) => {
    const x = startX + i * (boxW + 0.06);

    slide.addShape("roundRect", { x, y: boxY, w: boxW, h: 2.1, fill: { color: phase.color }, rectRadius: 0.08 });

    slide.addText(phase.name, {
      x: x + 0.05, y: boxY + 0.1, w: boxW - 0.1, h: 0.7,
      fontSize: 9.5, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
    });
    slide.addText(phase.duration, {
      x: x + 0.05, y: boxY + 0.8, w: boxW - 0.1, h: 0.35,
      fontSize: 9, color: COLORS.white, fontFace: FONT, align: "center", italic: true,
    });

    // Circle marker on timeline
    slide.addShape("ellipse", { x: x + boxW / 2 - 0.12, y: lineY + 0.48, w: 0.24, h: 0.24, fill: { color: phase.color } });
  });

  // Systems deploy note
  const enabledSystems = data.systems.filter(s => s.enabled);
  const systemsNote = `Systems in scope: ${enabledSystems.map(s => s.name).join("  →  ")}`;
  slide.addText(systemsNote, {
    x: 0.3, y: 4.2, w: 9.2, h: 0.3,
    fontSize: 9, color: COLORS.textGray, fontFace: FONT, align: "center", italic: true,
  });

  // Products note
  slide.addText(`SAP Products: ${data.selectedProducts.map(p => p.name).join("  |  ")}`, {
    x: 0.3, y: 4.55, w: 9.2, h: 0.4,
    fontSize: 8.5, color: COLORS.sapBlue, fontFace: FONT, align: "center",
  });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 10 – Implementation Approach (AI-generated)
// ──────────────────────────────────────────────
function addImplementationApproachSlide(pptx: PptxGenJS, data: FormData) {
  const bp = data.bestPractices;
  if (!bp) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Implementation Approach", bp.implementationApproach.title);

  const phases = bp.implementationApproach.phases;
  const colCount = Math.min(phases.length, 3);
  const colW = 9.2 / colCount - 0.12;
  const startX = 0.25;
  const phaseColors = [COLORS.teal, COLORS.sapBlue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.sapDarkBlue];

  phases.slice(0, 6).forEach((ph, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = startX + col * (colW + 0.12);
    const y = 1.1 + row * 2.95;
    const color = phaseColors[i % phaseColors.length];

    if (y + 2.8 > 7.2) return;

    // Phase header bar
    slide.addShape("roundRect", { x, y, w: colW, h: 0.42, fill: { color }, rectRadius: 0.06 });
    slide.addText(ph.phase, {
      x: x + 0.08, y, w: colW - 0.16, h: 0.42,
      fontSize: 9.5, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
    });

    // Activity list
    ph.activities.slice(0, 5).forEach((act, ai) => {
      const ay = y + 0.48 + ai * 0.44;
      if (ay + 0.4 > y + 2.8) return;
      const bg = ai % 2 === 0 ? COLORS.sapLightBlue : COLORS.lightGray;
      slide.addShape("roundRect", { x, y: ay, w: colW, h: 0.4, fill: { color: bg }, rectRadius: 0.04 });
      slide.addShape("ellipse", { x: x + 0.08, y: ay + 0.12, w: 0.16, h: 0.16, fill: { color } });
      slide.addText(act, {
        x: x + 0.3, y: ay + 0.04, w: colW - 0.38, h: 0.32,
        fontSize: 7.5, color: COLORS.darkGray, fontFace: FONT,
      });
    });
  });

  // AI badge
  slide.addShape("roundRect", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.06 });
  slide.addText("AI-Generated Guidance", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 11 – Critical Success Factors (AI-generated)
// ──────────────────────────────────────────────
function addCriticalSuccessFactorsSlide(pptx: PptxGenJS, data: FormData) {
  const bp = data.bestPractices;
  if (!bp) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Critical Success Factors", "Key factors for a successful implementation");

  const iconColors = [COLORS.sapBlue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.teal, COLORS.sapDarkBlue, "C0392B"];
  const csf = bp.criticalSuccessFactors.slice(0, 8);
  const splitAt = Math.ceil(csf.length / 2);

  csf.forEach((item, idx) => {
    const col = idx < splitAt ? 0 : 1;
    const rowIdx = idx < splitAt ? idx : idx - splitAt;
    const x = col === 0 ? 0.28 : 5.05;
    const y = 1.1 + rowIdx * 0.9;
    if (y + 0.82 > 7.0) return;
    const color = iconColors[idx % iconColors.length];
    slide.addShape("roundRect", { x, y, w: 4.45, h: 0.82, fill: { color: COLORS.lightGray }, line: { color: COLORS.medGray, width: 0.4 }, rectRadius: 0.08 });
    slide.addShape("roundRect", { x: x + 0.08, y: y + 0.08, w: 0.34, h: 0.66, fill: { color }, rectRadius: 0.04 });
    slide.addText(`${idx + 1}`, { x: x + 0.08, y: y + 0.08, w: 0.34, h: 0.66, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(item.factor, { x: x + 0.5, y: y + 0.07, w: 3.87, h: 0.25, fontSize: 9.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT });
    slide.addText(item.description, { x: x + 0.5, y: y + 0.33, w: 3.87, h: 0.44, fontSize: 8, color: COLORS.textGray, fontFace: FONT });
  });

  // Key recommendations strip
  if (bp.keyRecommendations.length > 0) {
    const recY = 6.6;
    slide.addShape("rect", { x: 0.25, y: recY, w: 9.3, h: 0.44, fill: { color: COLORS.sapLightBlue }, line: { color: COLORS.sapBlue, width: 0.4 } });
    slide.addText("Key Recommendations:  " + bp.keyRecommendations.slice(0, 3).join("   •   "), {
      x: 0.35, y: recY + 0.02, w: 9.1, h: 0.4,
      fontSize: 7.5, color: COLORS.sapDarkBlue, fontFace: FONT, italic: true,
    });
  }

  // AI badge
  slide.addShape("roundRect", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.06 });
  slide.addText("AI-Generated Guidance", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 12 – Risk Register (AI-generated)
// ──────────────────────────────────────────────
function addRiskRegisterSlide(pptx: PptxGenJS, data: FormData) {
  const bp = data.bestPractices;
  if (!bp) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Risk Register", "Identified Risks & Mitigation Strategies");

  const impactColors: Record<string, string> = { High: "C0392B", Medium: COLORS.orange, Low: COLORS.green };
  const probColors:   Record<string, string> = { High: "C0392B", Medium: COLORS.orange, Low: COLORS.teal };

  // Table headers
  const colWidths = [3.4, 0.9, 1.0, 4.0];
  const headers = ["Risk", "Impact", "Probability", "Mitigation Strategy"];
  const tableX = 0.25;
  const headerY = 1.05;
  let hx = tableX;

  headers.forEach((h, i) => {
    slide.addShape("rect", { x: hx, y: headerY, w: colWidths[i], h: 0.38, fill: { color: COLORS.sapDarkBlue }, line: { color: COLORS.white, width: 0.4 } });
    slide.addText(h, { x: hx + 0.05, y: headerY, w: colWidths[i] - 0.1, h: 0.38, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: i === 0 ? "left" : "center" });
    hx += colWidths[i];
  });

  const risks = bp.riskRegister.slice(0, 9);
  risks.forEach((risk, i) => {
    const rowY = headerY + 0.38 + i * 0.6;
    if (rowY + 0.56 > 7.1) return;
    const rowBg = i % 2 === 0 ? COLORS.rowAlt : COLORS.white;
    let rx = tableX;

    // Risk description
    slide.addShape("rect", { x: rx, y: rowY, w: colWidths[0], h: 0.56, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.3 } });
    slide.addText(risk.risk, { x: rx + 0.08, y: rowY + 0.06, w: colWidths[0] - 0.16, h: 0.44, fontSize: 8.5, color: COLORS.darkGray, fontFace: FONT });
    rx += colWidths[0];

    // Impact badge
    slide.addShape("rect", { x: rx, y: rowY, w: colWidths[1], h: 0.56, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.3 } });
    const impColor = impactColors[risk.impact] ?? COLORS.textGray;
    slide.addShape("roundRect", { x: rx + 0.08, y: rowY + 0.1, w: colWidths[1] - 0.16, h: 0.36, fill: { color: impColor }, rectRadius: 0.04 });
    slide.addText(risk.impact, { x: rx + 0.08, y: rowY + 0.1, w: colWidths[1] - 0.16, h: 0.36, fontSize: 8, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    rx += colWidths[1];

    // Probability badge
    slide.addShape("rect", { x: rx, y: rowY, w: colWidths[2], h: 0.56, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.3 } });
    const probColor = probColors[risk.probability] ?? COLORS.textGray;
    slide.addShape("roundRect", { x: rx + 0.08, y: rowY + 0.1, w: colWidths[2] - 0.16, h: 0.36, fill: { color: probColor }, rectRadius: 0.04 });
    slide.addText(risk.probability, { x: rx + 0.08, y: rowY + 0.1, w: colWidths[2] - 0.16, h: 0.36, fontSize: 8, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    rx += colWidths[2];

    // Mitigation
    slide.addShape("rect", { x: rx, y: rowY, w: colWidths[3], h: 0.56, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.3 } });
    slide.addText(risk.mitigation, { x: rx + 0.08, y: rowY + 0.06, w: colWidths[3] - 0.16, h: 0.44, fontSize: 8, color: COLORS.textGray, fontFace: FONT });
    rx += colWidths[3];
  });

  // Integration best practices strip at bottom
  if (bp.integrationBestPractices.length > 0) {
    const bpY = 6.62;
    slide.addShape("rect", { x: 0.25, y: bpY, w: 9.3, h: 0.48, fill: { color: COLORS.sapLightBlue }, line: { color: COLORS.sapBlue, width: 0.4 } });
    slide.addText("Integration Best Practices:  " + bp.integrationBestPractices.slice(0, 2).join("   •   "), {
      x: 0.35, y: bpY + 0.04, w: 9.1, h: 0.4,
      fontSize: 7.5, color: COLORS.sapDarkBlue, fontFace: FONT, italic: true,
    });
  }

  // AI badge
  slide.addShape("roundRect", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.06 });
  slide.addText("AI-Generated Guidance", { x: 8.1, y: 0.95, w: 1.65, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// Service Catalog Slide
// ──────────────────────────────────────────────
function addServiceCatalogSlide(pptx: PptxGenJS, data: FormData) {
  const catalog = data.serviceCatalog?.filter(e => e.included);
  if (!catalog || catalog.length === 0) return;

  const tierColors: Record<string, string> = {
    Standard: COLORS.sapBlue,
    Enhanced: COLORS.teal,
    Premium:  COLORS.accentGold,
  };
  const tierTextColors: Record<string, string> = {
    Standard: COLORS.white,
    Enhanced: COLORS.white,
    Premium:  COLORS.sapDarkBlue,
  };

  // Split into chunks of ~16 rows per slide
  const chunkSize = 14;
  const chunks: typeof catalog[] = [];
  for (let i = 0; i < catalog.length; i += chunkSize) {
    chunks.push(catalog.slice(i, i + chunkSize));
  }

  chunks.forEach((chunk, pageIdx) => {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
    addSlideHeader(slide, "AMS Service Catalog", chunks.length > 1 ? `Service Overview (Page ${pageIdx + 1} of ${chunks.length})` : "Service Overview");

    const tableX = 0.25;
    const headerH = 0.36;
    const rowH = DENSITY.rowHeight;
    const startY = 1.05;
    const colWidths = [1.8, 2.5, 1.6, 1.1, 1.2, 1.55];
    const headers = ["Category", "Service Name", "SLA Target", "Tier", "Frequency", "Deliverable"];
    let hx = tableX;

    headers.forEach((h, i) => {
      const isFirst = i === 0;
      slide.addShape("rect", {
        x: hx, y: startY, w: colWidths[i], h: headerH,
        fill: { color: isFirst ? COLORS.sapDarkBlue : COLORS.sapBlue },
        line: { color: COLORS.white, width: 0.4 },
      });
      slide.addText(h, {
        x: hx + 0.04, y: startY, w: colWidths[i] - 0.08, h: headerH,
        fontSize: 7.5, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
      });
      hx += colWidths[i];
    });

    chunk.forEach((entry, ri) => {
      const rowY = startY + headerH + ri * rowH;
      const rowBg = ri % 2 === 0 ? COLORS.rowAlt : COLORS.white;
      let rx = tableX;

      const cells = [entry.category, entry.serviceName, entry.slaTarget, entry.tier, entry.frequency, entry.deliverable];
      cells.forEach((cell, ci) => {
        if (ci === 3) {
          // Tier badge
          const tc = tierColors[entry.tier] ?? COLORS.sapBlue;
          const tfc = tierTextColors[entry.tier] ?? COLORS.white;
          slide.addShape("rect", { x: rx, y: rowY, w: colWidths[ci], h: rowH, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.2 } });
          slide.addShape("roundRect", { x: rx + 0.08, y: rowY + 0.04, w: colWidths[ci] - 0.16, h: rowH - 0.08, fill: { color: tc }, rectRadius: 0.03 });
          slide.addText(cell, { x: rx + 0.08, y: rowY + 0.04, w: colWidths[ci] - 0.16, h: rowH - 0.08, fontSize: 6.5, bold: true, color: tfc, fontFace: FONT, align: "center" });
        } else {
          slide.addShape("rect", { x: rx, y: rowY, w: colWidths[ci], h: rowH, fill: { color: rowBg }, line: { color: COLORS.medGray, width: 0.2 } });
          slide.addText(cell, { x: rx + 0.05, y: rowY + 0.03, w: colWidths[ci] - 0.1, h: rowH - 0.06, fontSize: 7, color: COLORS.darkGray, fontFace: FONT });
        }
        rx += colWidths[ci];
      });
    });

    // Legend
    const legendY = 6.78;
    slide.addText("Tier:", { x: 0.25, y: legendY, w: 0.5, h: 0.22, fontSize: 7, color: COLORS.textGray, fontFace: FONT, italic: true });
    [["Standard", COLORS.sapBlue, COLORS.white], ["Enhanced", COLORS.teal, COLORS.white], ["Premium", COLORS.accentGold, COLORS.sapDarkBlue]].forEach(([label, bg, fg], i) => {
      const lx = 0.75 + i * 1.3;
      slide.addShape("roundRect", { x: lx, y: legendY + 0.01, w: 1.2, h: 0.2, fill: { color: bg }, rectRadius: 0.03 });
      slide.addText(label, { x: lx, y: legendY + 0.01, w: 1.2, h: 0.2, fontSize: 6.5, bold: true, color: fg, fontFace: FONT, align: "center" });
    });

    addSlideFooter(slide, data);
  });
}

// ──────────────────────────────────────────────
// Commercial Shape Slide
// ──────────────────────────────────────────────
function addCommercialShapeSlide(pptx: PptxGenJS, data: FormData) {
  const c = data.commercialShape;
  if (!c) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Commercial Shape", "Engagement Model & Commercial Terms");

  const rows: Array<[string, string]> = [
    ["Engagement Model",  c.engagementModel || "—"],
    ["Currency",          c.currency || "—"],
    ["Total Contract Value", c.totalValue || "—"],
    ["Payment Terms",     c.paymentTerms || "—"],
    ["Payment Schedule",  c.paymentSchedule || "—"],
    ["Expense Policy",    c.expensePolicy || "—"],
    ["Warranty Period",   c.warrantyPeriod || "—"],
    ["Governing Law",     c.governingLaw || "—"],
    ["Notice Period",     c.noticeperiod || "—"],
    ["Penalty Clauses",   c.penaltyClauses || "—"],
  ];

  const tableX = 0.25;
  const labelW = 3.5;
  const valueW = 6.0;
  const rH = 0.42;

  rows.forEach(([label, value], i) => {
    const rowY = 1.1 + i * (rH + 0.04);
    if (rowY + rH > 7.0) return;
    const bg = i % 2 === 0 ? COLORS.rowAlt : COLORS.white;

    slide.addShape("rect", { x: tableX, y: rowY, w: labelW, h: rH, fill: { color: COLORS.sapDarkBlue }, line: { color: COLORS.white, width: 0.4 } });
    slide.addText(label, { x: tableX + 0.1, y: rowY, w: labelW - 0.2, h: rH, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT });

    slide.addShape("rect", { x: tableX + labelW, y: rowY, w: valueW, h: rH, fill: { color: bg }, line: { color: COLORS.medGray, width: 0.3 } });
    slide.addText(value, { x: tableX + labelW + 0.12, y: rowY, w: valueW - 0.24, h: rH, fontSize: 9.5, color: COLORS.darkGray, fontFace: FONT });
  });

  if (c.additionalTerms) {
    const notesY = 1.1 + rows.length * (rH + 0.04) + 0.1;
    if (notesY + 0.6 < 7.1) {
      slide.addShape("roundRect", { x: tableX, y: notesY, w: labelW + valueW, h: 0.6, fill: { color: COLORS.sapLightBlue }, line: { color: COLORS.sapBlue, width: 0.4 }, rectRadius: 0.06 });
      slide.addText("Additional Terms:", { x: tableX + 0.12, y: notesY + 0.04, w: 2, h: 0.22, fontSize: 8, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT });
      slide.addText(c.additionalTerms, { x: tableX + 0.12, y: notesY + 0.26, w: labelW + valueW - 0.24, h: 0.3, fontSize: 8.5, color: COLORS.darkGray, fontFace: FONT });
    }
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// Client Context Slide (verbatim pass-through)
// ──────────────────────────────────────────────
function addClientContextSlide(pptx: PptxGenJS, data: FormData) {
  const ctx = data.clientContext?.trim();
  if (!ctx) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Client Context", "Background & Strategic Context");

  // Decorative left bar
  slide.addShape("rect", { x: 0.25, y: 1.05, w: 0.06, h: 5.9, fill: { color: COLORS.accentGold } });

  // Render text verbatim — split into paragraphs for readable wrapping
  const paragraphs = ctx.split(/\n{1,}/).filter(p => p.trim());
  let curY = 1.1;
  const textX = 0.45;
  const textW = 9.1;
  const paraSpacing = 0.18;
  const lineH = DENSITY.bodyFontSize * 0.022; // approximate inches per line

  paragraphs.forEach(para => {
    if (curY + lineH > 6.9) return;
    // Estimate height: ~80 chars per line at 10pt in 9.1" wide
    const charsPerLine = Math.floor(textW / (DENSITY.bodyFontSize * 0.072));
    const lines = Math.ceil(para.length / charsPerLine) || 1;
    const blockH = Math.min(lines * lineH + 0.08, 6.9 - curY);

    slide.addText(para, {
      x: textX, y: curY, w: textW, h: blockH,
      fontSize: DENSITY.bodyFontSize,
      color: COLORS.darkGray,
      fontFace: FONT,
    });
    curY += blockH + paraSpacing;
  });

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// AMS Details Slide
// ──────────────────────────────────────────────
function addAMSSlide(pptx: PptxGenJS, data: FormData) {
  const a = data.amsData;
  if (!a) return;

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "AMS Service Overview", "Application Management Services — Service Parameters");

  // ── KPI metric cards row ──────────────────────────
  const kpis: Array<{ label: string; value: string; sub?: string; color: string }> = [
    { label: "Total Users",        value: a.totalUsers       || "—", sub: a.namedUsers ? `${a.namedUsers} named` : undefined, color: COLORS.sapDarkBlue },
    { label: "Concurrent Users",   value: a.concurrentUsers  || "—", color: COLORS.sapBlue },
    { label: "Support Hours",      value: a.supportHours,             color: COLORS.teal },
    { label: "Availability",       value: a.availability,             color: COLORS.green },
    { label: "Contract Duration",  value: a.contractDuration,         color: COLORS.orange },
  ];
  const kpiW = 9.3 / kpis.length - 0.1;
  kpis.forEach((k, i) => {
    const x = 0.25 + i * (kpiW + 0.1);
    slide.addShape("roundRect", { x, y: 1.05, w: kpiW, h: 1.05, fill: { color: k.color }, rectRadius: 0.08 });
    slide.addText(k.value, {
      x: x + 0.06, y: 1.1, w: kpiW - 0.12, h: 0.55,
      fontSize: 18, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
    });
    slide.addText(k.label, {
      x: x + 0.06, y: 1.63, w: kpiW - 0.12, h: 0.22,
      fontSize: 7.5, color: COLORS.white, fontFace: FONT, align: "center",
    });
    if (k.sub) {
      slide.addText(k.sub, {
        x: x + 0.06, y: 1.85, w: kpiW - 0.12, h: 0.18,
        fontSize: 6.5, color: COLORS.accentGold, fontFace: FONT, align: "center", italic: true,
      });
    }
  });

  // ── Left column — Support Model & Scope ──────────
  const colY = 2.28;
  const colH = 4.6;
  const lx = 0.25;
  const lw = 4.5;

  slide.addShape("roundRect", { x: lx, y: colY, w: lw, h: colH, fill: { color: COLORS.sapLightBlue }, line: { color: COLORS.medGray, width: 0.4 }, rectRadius: 0.08 });

  // Section title
  slide.addShape("roundRect", { x: lx, y: colY, w: lw, h: 0.36, fill: { color: COLORS.sapDarkBlue }, rectRadius: 0.08 });
  slide.addText("Support Model & Scope", {
    x: lx + 0.12, y: colY, w: lw - 0.24, h: 0.36,
    fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT,
  });

  const leftRows: Array<{ label: string; value: string }> = [
    { label: "Support Model",          value: a.supportModel },
    { label: "Support Languages",      value: a.supportLanguages || "—" },
    { label: "Onshore / Offshore",     value: `${a.onshorePercent || "—"}% / ${a.offshorePercent || "—"}%` },
    { label: "Monthly Ticket Volume",  value: a.monthlyTickets },
    { label: "Monthly Changes (est.)", value: a.monthlyChanges || "—" },
    { label: "Hypercare Duration",     value: a.hypercareDuration ? `${a.hypercareDuration} weeks` : "—" },
    { label: "Training Hours",         value: a.trainingHours || "—" },
    { label: "Transaction Volume",     value: a.txVolume },
    { label: "Service Review",         value: a.reviewFrequency },
    { label: "Dedicated Contacts",     value: a.dedicatedContacts || "—" },
  ];

  leftRows.forEach((row, i) => {
    const ry = colY + 0.42 + i * 0.4;
    if (ry + 0.38 > colY + colH) return;
    const bg = i % 2 === 0 ? COLORS.white : COLORS.sapLightBlue;
    slide.addShape("rect", { x: lx + 0.06, y: ry, w: lw - 0.12, h: 0.36, fill: { color: bg }, line: { color: COLORS.medGray, width: 0.2 } });
    slide.addText(row.label, {
      x: lx + 0.12, y: ry + 0.05, w: 2.0, h: 0.26,
      fontSize: 8, color: COLORS.textGray, fontFace: FONT,
    });
    slide.addText(row.value, {
      x: lx + 2.2, y: ry + 0.05, w: lw - 2.36, h: 0.26,
      fontSize: 8.5, bold: true, color: COLORS.darkGray, fontFace: FONT,
    });
  });

  // ── Right column — SLA Grid ───────────────────────
  const rx2 = 5.0;
  const rw = 4.75;

  slide.addShape("roundRect", { x: rx2, y: colY, w: rw, h: colH, fill: { color: COLORS.lightGray }, line: { color: COLORS.medGray, width: 0.4 }, rectRadius: 0.08 });
  slide.addShape("roundRect", { x: rx2, y: colY, w: rw, h: 0.36, fill: { color: COLORS.sapBlue }, rectRadius: 0.08 });
  slide.addText("SLA Targets", {
    x: rx2 + 0.12, y: colY, w: rw - 0.24, h: 0.36,
    fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT,
  });

  const slaRows: Array<{ priority: string; label: string; value: string; color: string }> = [
    { priority: "P1", label: "Critical — System Down",       value: a.slaP1, color: "C0392B" },
    { priority: "P2", label: "High — Major Function Impact", value: a.slaP2, color: COLORS.orange },
    { priority: "P3", label: "Medium — Partial Impact",      value: a.slaP3, color: "D4AC0D" },
    { priority: "P4", label: "Low — Minor / Cosmetic",       value: a.slaP4, color: COLORS.teal },
  ];

  slaRows.forEach((row, i) => {
    const sy = colY + 0.44 + i * 0.52;
    slide.addShape("roundRect", { x: rx2 + 0.1, y: sy, w: rw - 0.2, h: 0.46, fill: { color: COLORS.white }, line: { color: COLORS.medGray, width: 0.3 }, rectRadius: 0.05 });

    // Priority badge
    slide.addShape("roundRect", { x: rx2 + 0.16, y: sy + 0.08, w: 0.36, h: 0.3, fill: { color: row.color }, rectRadius: 0.04 });
    slide.addText(row.priority, { x: rx2 + 0.16, y: sy + 0.08, w: 0.36, h: 0.3, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

    slide.addText(row.label, { x: rx2 + 0.6, y: sy + 0.08, w: 2.6, h: 0.3, fontSize: 8, color: COLORS.textGray, fontFace: FONT });

    // Response time badge
    slide.addShape("roundRect", { x: rx2 + rw - 1.15, y: sy + 0.06, w: 1.0, h: 0.34, fill: { color: row.color + "1A" }, line: { color: row.color, width: 0.6 }, rectRadius: 0.04 });
    slide.addText(row.value, { x: rx2 + rw - 1.15, y: sy + 0.06, w: 1.0, h: 0.34, fontSize: 9, bold: true, color: row.color, fontFace: FONT, align: "center" });
  });

  // Escalation path
  const escY = colY + 0.44 + slaRows.length * 0.52 + 0.1;
  if (escY + 0.44 < colY + colH) {
    slide.addShape("roundRect", { x: rx2 + 0.1, y: escY, w: rw - 0.2, h: 0.44, fill: { color: COLORS.sapLightBlue }, line: { color: COLORS.sapBlue, width: 0.4 }, rectRadius: 0.05 });
    slide.addText("Escalation Path", { x: rx2 + 0.2, y: escY + 0.04, w: 1.4, h: 0.18, fontSize: 7.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT });
    slide.addText(a.escalationPath || "L1 → L2 → L3 → SAP Support", {
      x: rx2 + 0.2, y: escY + 0.2, w: rw - 0.4, h: 0.2,
      fontSize: 8, color: COLORS.sapDarkBlue, fontFace: FONT,
    });
  }

  // Exclusions / notes strip
  if (a.exclusions || a.additionalNotes) {
    const noteY = colY + colH + 0.08;
    const noteText = [a.exclusions && `Exclusions: ${a.exclusions}`, a.additionalNotes && `Notes: ${a.additionalNotes}`].filter(Boolean).join("   |   ");
    if (noteY + 0.3 < 7.2) {
      slide.addShape("rect", { x: 0.25, y: noteY, w: 9.3, h: 0.28, fill: { color: COLORS.lightGray }, line: { color: COLORS.medGray, width: 0.3 } });
      slide.addText(noteText, { x: 0.35, y: noteY + 0.04, w: 9.1, h: 0.2, fontSize: 7, color: COLORS.textGray, fontFace: FONT, italic: true });
    }
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// Main export function
// ──────────────────────────────────────────────
export async function generatePptx(data: FormData): Promise<void> {
  // Apply output config (theme, font, density, labels)
  applyConfig(data.outputConfig);
  _slideNumber = 0;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = data.projectName;
  pptx.subject = "SAP Solution Architecture";
  pptx.author = data.preparedBy;
  pptx.company = data.client;

  const s = data.outputConfig?.slides;

  if (!s || s.title)        addTitleSlide(pptx, data);
  if (!s || s.products)     addProductsSlide(pptx, data);
  if (data.clientContext?.trim() && (!s || s.clientContext)) addClientContextSlide(pptx, data);
  if (!s || s.landscape)    addLandscapeSlide(pptx, data);
  if (!s || s.scope)        addScopeSlide(pptx, data);
  if (!s || s.raci)         addRACISlide(pptx, data);
  if (!s || s.dependencies) addDependenciesSlide(pptx, data);
  if (!s || s.assumptions)  addAssumptionsSlide(pptx, data);
  if (!s || s.resources)    addResourceLoadingSlide(pptx, data);
  if (!s || s.timeline)     addTimelineSlide(pptx, data);
  if (data.amsData && (!s || s.ams))                        addAMSSlide(pptx, data);
  if (data.serviceCatalog?.length && (!s || s.serviceCatalog)) addServiceCatalogSlide(pptx, data);
  if (data.commercialShape && (!s || s.commercial))          addCommercialShapeSlide(pptx, data);

  if (data.bestPractices) {
    if (!s || s.aiApproach) addImplementationApproachSlide(pptx, data);
    if (!s || s.aiCSF)      addCriticalSuccessFactorsSlide(pptx, data);
    if (!s || s.aiRisks)    addRiskRegisterSlide(pptx, data);
  }

  const filename = `${data.projectName.replace(/\s+/g, "_")}_Solution_Architecture.pptx`;
  await pptx.writeFile({ fileName: filename });
}
