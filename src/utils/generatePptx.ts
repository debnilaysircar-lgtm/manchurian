import PptxGenJS from "pptxgenjs";
import type { SAPProduct } from "../data/sapProducts";
import type { BestPracticesResponse } from "./fetchBestPractices";
import type { OutputConfig } from "../types/outputConfig";
import { THEME_PALETTES, DENSITY_SETTINGS } from "../types/outputConfig";
import type { AMSData } from "../types/amsData";
import type { ServiceCatalogEntry } from "../types/serviceCatalog";
import { AMS_ARCHITECTURE } from "../data/amsArchitectureData";

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
  selectedCapabilities?: Set<string>;
  outOfScopeGaps?: Set<string>;      // manually selected EMEA gap items
  autoOutOfScope?: Set<string>;      // unselected AMS capabilities (auto-derived)
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
  sapBlue: "7900BF",       // Accenture purple (primary accent)
  sapDarkBlue: "0A1B3D",   // Dark navy (headers, table headings)
  sapLightBlue: "F3F5FB",  // Light card background
  accentGold: "C7A26A",    // Gold accent
  white: "FFFFFF",
  lightGray: "F3F5FB",
  medGray: "D6DBE6",
  darkGray: "0A1B3D",
  textGray: "2A3759",      // Body text
  rowAlt: "F3F5FB",
  green: "107E3E",
  orange: "E9730C",
  purple: "6A2C8E",
  teal: "0F7B8C",
  mutedGray: "5A6478",     // Muted / secondary text
  dividerGray: "D6DBE6",   // Thin rule dividers
  cardBg: "F3F5FB",        // Card / section background
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
    rowAlt: "F3F5FB",  // use reference card-bg for all alternating rows
  };
  FONT = cfg?.font ?? "Calibri";
  DENSITY = DENSITY_SETTINGS[cfg?.density ?? "standard"];
  CONFIDENTIALITY = cfg?.confidentialityLabel ?? "CONFIDENTIAL";
  SHOW_SLIDE_NUMBERS = cfg?.showSlideNumbers ?? true;
  LOGO_TEXT = cfg?.companyLogoText || "SAP";
}

let _slideNumber = 0;

function addSlideHeader(slide: PptxGenJS.Slide, title: string, sectionTag?: string, data?: FormData) {
  // ── Top nav row: small dark square · breadcrumb · page number ────────
  slide.addShape("rect", {
    x: 0.28, y: 0.22, w: 0.17, h: 0.17,
    fill: { color: COLORS.sapDarkBlue },
  });
  const crumb = data ? `${LOGO_TEXT}  ·  ${data.projectName}` : LOGO_TEXT;
  slide.addText(crumb, {
    x: 0.56, y: 0.21, w: 10.5, h: 0.19,
    fontSize: 9, color: COLORS.mutedGray, fontFace: FONT,
  });
  if (SHOW_SLIDE_NUMBERS) {
    slide.addText(`${String(_slideNumber + 1).padStart(2, "0")}`, {
      x: 11.8, y: 0.21, w: 1.25, h: 0.19,
      fontSize: 9, color: COLORS.mutedGray, fontFace: FONT, align: "right",
    });
  }

  // Thin horizontal divider below nav
  slide.addShape("rect", {
    x: 0.28, y: 0.44, w: 12.77, h: 0.007,
    fill: { color: COLORS.dividerGray },
  });

  // ── Section tag (uppercase, Accenture purple) ────────────────────────
  if (sectionTag) {
    slide.addText(sectionTag.toUpperCase(), {
      x: 0.28, y: 0.49, w: 12.5, h: 0.22,
      fontSize: 10, bold: true, color: COLORS.sapBlue, fontFace: FONT, charSpacing: 1.5,
    });
    // Purple accent bar (matches reference width ~0.55")
    slide.addShape("rect", {
      x: 0.28, y: 0.72, w: 0.55, h: 0.025,
      fill: { color: COLORS.sapBlue },
    });
  }

  // ── Main heading (dark navy, bold, 28pt) ─────────────────────────────
  const headingY = sectionTag ? 0.76 : 0.50;
  const headingH = sectionTag ? 0.52 : 0.65;
  slide.addText(title, {
    x: 0.28, y: headingY, w: 12.77, h: headingH,
    fontSize: 28, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT,
  });
}

function addSlideFooter(slide: PptxGenJS.Slide, data: FormData) {
  _slideNumber++;
  // Thin grey divider
  slide.addShape("rect", {
    x: 0.28, y: 7.17, w: 12.77, h: 0.007,
    fill: { color: COLORS.dividerGray },
  });
  // Left: project · version
  const issued = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  slide.addText(`${data.projectName}  ·  v${data.version}  ·  ${issued}`, {
    x: 0.28, y: 7.24, w: 8.5, h: 0.19,
    fontSize: 8, color: COLORS.mutedGray, fontFace: FONT,
  });
  // Right: confidentiality
  if (CONFIDENTIALITY) {
    slide.addText(CONFIDENTIALITY, {
      x: 8.8, y: 7.24, w: 4.25, h: 0.19,
      fontSize: 8, color: COLORS.mutedGray, fontFace: FONT, align: "right",
    });
  }
}

// ──────────────────────────────────────────────
// SLIDE 1 – Title (Accenture reference design)
// ──────────────────────────────────────────────
function addTitleSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();

  // Full dark navy background
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "061333" } });

  // Top-left: ">" in purple + company logo text
  slide.addText(">", {
    x: 0.45, y: 0.52, w: 0.25, h: 0.30,
    fontSize: 18, bold: true, color: "7900BF", fontFace: FONT, align: "center",
  });
  slide.addText(LOGO_TEXT || "accenture", {
    x: 0.73, y: 0.52, w: 3.0, h: 0.30,
    fontSize: 14, bold: true, color: "FFFFFF", fontFace: FONT,
  });

  // Top-right: "PREPARED FOR" label + gold accent + client name
  slide.addText("PREPARED FOR", {
    x: 9.2, y: 0.52, w: 3.9, h: 0.20,
    fontSize: 10, color: "E7ECF6", fontFace: FONT, charSpacing: 1.5,
  });
  slide.addShape("rect", {
    x: 9.3, y: 0.78, w: 0.15, h: 0.15,
    fill: { color: "C7A26A" },
  });
  slide.addText(data.client || "—", {
    x: 9.54, y: 0.75, w: 3.55, h: 0.24,
    fontSize: 12, bold: true, color: "FFFFFF", fontFace: FONT,
  });

  // Subtitle line in light purple
  const subtitle = `SOLUTION PLAN  ·  v${data.version}  ·  AMS`;
  slide.addText(subtitle, {
    x: 0.45, y: 1.10, w: 12.4, h: 0.28,
    fontSize: 13, bold: true, color: "B585D9", fontFace: FONT,
  });

  // Main title (large, bold, white) — two chunks for visual weight
  slide.addText(data.projectName || "SAP BG", {
    x: 0.45, y: 1.46, w: 12.4, h: 1.5,
    fontSize: 60, bold: true, color: "FFFFFF", fontFace: FONT,
  });

  // Descriptor / sub-title
  slide.addText("Application Management Services", {
    x: 0.45, y: 3.08, w: 12.4, h: 0.36,
    fontSize: 22, color: "E7ECF6", fontFace: FONT,
  });

  // Products list in muted text
  const products = data.selectedProducts.slice(0, 8).map(p => p.name).join("   ·   ");
  if (products) {
    slide.addText(products, {
      x: 0.45, y: 3.52, w: 12.4, h: 0.24,
      fontSize: 10, color: "5A6478", fontFace: FONT, charSpacing: 1,
    });
  }

  // White thin divider above meta section
  slide.addShape("rect", { x: 0.45, y: 4.80, w: 12.4, h: 0.01, fill: { color: "FFFFFF" } });

  // Bottom meta section: four columns
  const issued = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const metas = [
    { label: "CLIENT",          value: data.client },
    { label: "PROJECT MANAGER", value: data.projectManager },
    { label: "PREPARED BY",     value: data.preparedBy },
    { label: "ISSUED",          value: issued },
  ];
  metas.forEach((m, i) => {
    const x = 0.45 + i * 3.1;
    slide.addText(m.label, {
      x, y: 4.95, w: 3.0, h: 0.22,
      fontSize: 9, color: "E7ECF6", fontFace: FONT,
    });
    slide.addText(m.value || "—", {
      x, y: 5.22, w: 3.0, h: 0.28,
      fontSize: 13, bold: true, color: "FFFFFF", fontFace: FONT,
    });
  });

  // White thin divider + confidentiality at very bottom
  slide.addShape("rect", { x: 0.45, y: 6.86, w: 12.4, h: 0.01, fill: { color: "FFFFFF" } });
  slide.addText(`${LOGO_TEXT || "ACCENTURE"}  ·  ${CONFIDENTIALITY || "CONFIDENTIAL"} — NOT FOR REDISTRIBUTION`, {
    x: 0.45, y: 7.02, w: 12.4, h: 0.20,
    fontSize: 8.5, color: "E7ECF6", fontFace: FONT,
  });
}

// ──────────────────────────────────────────────
// SLIDE 2 – Executive Summary / Products Overview
// ──────────────────────────────────────────────
function addProductsSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "SAP Products in Scope", "Products in Scope", data);

  const products = data.selectedProducts;
  const cols = 2;
  const startY = 1.38;
  const cardH = 0.84;
  const cardW = 6.0;
  const gap = 0.10;

  products.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col === 0 ? 0.28 : 6.77;
    const y = startY + row * (cardH + gap);

    if (y + cardH > 7.15) return;

    // Card background — light with left purple stripe
    const bgColor = COLORS.cardBg;
    slide.addShape("roundRect", { x, y, w: cardW, h: cardH, fill: { color: bgColor }, line: { color: COLORS.dividerGray, width: 0.5 }, rectRadius: 0.05 });
    // Left accent stripe
    slide.addShape("rect", { x, y, w: 0.025, h: cardH, fill: { color: COLORS.sapBlue } });

    // Category tag
    slide.addText(p.category.toUpperCase(), {
      x: x + 0.15, y: y + 0.07, w: cardW - 0.24, h: 0.2,
      fontSize: 7.5, bold: true, color: COLORS.sapBlue, fontFace: FONT,
    });

    slide.addText(p.name, {
      x: x + 0.15, y: y + 0.27, w: cardW - 0.24, h: 0.28,
      fontSize: 12, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT,
    });
    slide.addText(p.description, {
      x: x + 0.15, y: y + 0.52, w: cardW - 0.24, h: 0.26,
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

  addSlideHeader(slide, "System Landscape", "Deployment Architecture", data);

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
  const boxW = total > 0 ? Math.min(2.2, (12.77 / total) - 0.15) : 2.2;
  const boxH = 3.5;
  const startX = 0.28 + (12.77 - (boxW + 0.2) * total + 0.2) / 2;
  const arrowY = 1.65 + boxH / 2;

  enabled.forEach((sys, i) => {
    const x = startX + i * (boxW + 0.2);
    const color = envColors[sys.name] || COLORS.sapBlue;

    // Box
    slide.addShape("roundRect", { x, y: 1.38, w: boxW, h: boxH, fill: { color }, line: { color: "FFFFFF", width: 0.5 }, rectRadius: 0.1 });

    // System name header
    slide.addText(sys.name, {
      x, y: 1.43, w: boxW, h: 0.4,
      fontSize: 10, bold: true, color: COLORS.white, fontFace: FONT, align: "center",
    });

    // Description
    slide.addText(sys.description, {
      x: x + 0.07, y: 1.88, w: boxW - 0.14, h: 0.5,
      fontSize: 8, color: COLORS.white, fontFace: FONT, align: "center",
    });

    // Product list inside box
    const prodNames = data.selectedProducts.slice(0, 5).map(p => "• " + (p.name.length > 22 ? p.name.substring(0, 20) + "…" : p.name));
    slide.addText(prodNames.join("\n"), {
      x: x + 0.07, y: 2.42, w: boxW - 0.14, h: 2.2,
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
      x: 0.28, y: 5.1, w: 12.77, h: 0.3,
      fontSize: 9, color: COLORS.mutedGray, fontFace: FONT, align: "center", italic: true,
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

  addSlideHeader(slide, "Project Scope", "In-Scope Deliverables", data);

  // Two-column layout: In Scope | Out of Scope
  const colW = 6.0;
  const colY = 1.38;
  const col2X = 6.77;

  // In Scope header — dark navy fill, white text
  slide.addShape("rect", { x: 0.28, y: colY, w: colW, h: 0.38, fill: { color: COLORS.sapDarkBlue } });
  slide.addText("✔  IN SCOPE", { x: 0.28, y: colY, w: colW, h: 0.38, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

  // Out of Scope header
  slide.addShape("rect", { x: col2X, y: colY, w: colW, h: 0.38, fill: { color: "C0392B" } });
  slide.addText("✖  OUT OF SCOPE", { x: col2X, y: colY, w: colW, h: 0.38, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

  // In-scope items
  const inScopeItems = data.scopeItems.filter(Boolean);
  inScopeItems.forEach((item, i) => {
    const y = colY + 0.44 + i * 0.36;
    if (y > 6.92) return;
    const bg = i % 2 === 0 ? COLORS.cardBg : COLORS.white;
    slide.addShape("rect", { x: 0.28, y, w: colW, h: 0.34, fill: { color: bg }, line: { color: COLORS.dividerGray, width: 0.2 } });
    slide.addText(`${i + 1}.  ${item}`, { x: 0.38, y: y + 0.04, w: colW - 0.2, h: 0.26, fontSize: 9, color: COLORS.textGray, fontFace: FONT });
  });

  // ── Out-of-scope column: two labelled groups ─────────────────────────
  const gapItems    = data.outOfScopeGaps  ? Array.from(data.outOfScopeGaps)  : [];
  const autoItems   = data.autoOutOfScope  ? Array.from(data.autoOutOfScope)  : [];
  const defaultItems = [
    "Custom development beyond agreed specifications",
    "Data migration from non-SAP legacy systems",
    "Third-party integrations not listed in scope",
    "End-user hardware provisioning",
    "Production support post go-live (unless contracted)",
    "Regulatory compliance advisory services",
  ];

  // If nothing is selected from either source, fall back to defaults
  const hasAny = gapItems.length > 0 || autoItems.length > 0;

  const ox = col2X;
  let outY = colY + 0.44;
  const rowH = 0.32;
  const rowGap = 0.03;
  const maxY = 6.92;

  function addOutRow(label: string, idx: number, bgOverride?: string) {
    if (outY + rowH > maxY) return;
    const bg = bgOverride ?? (idx % 2 === 0 ? COLORS.lightGray : COLORS.white);
    slide.addShape("rect", { x: ox, y: outY, w: colW, h: rowH, fill: { color: bg } });
    slide.addText(`${idx + 1}.  ${label}`, {
      x: ox + 0.1, y: outY + 0.04, w: colW - 0.2, h: rowH - 0.08,
      fontSize: 9, color: COLORS.darkGray, fontFace: FONT,
    });
    outY += rowH + rowGap;
  }

  function addGroupHeader(label: string, color: string) {
    if (outY + 0.26 > maxY) return;
    slide.addShape("rect", { x: ox, y: outY, w: colW, h: 0.26, fill: { color } });
    slide.addText(label, {
      x: ox + 0.1, y: outY, w: colW - 0.2, h: 0.26,
      fontSize: 7.5, bold: true, color: COLORS.white, fontFace: FONT, charSpacing: 1,
    });
    outY += 0.26 + 0.04;
  }

  if (!hasAny) {
    defaultItems.forEach((item, i) => addOutRow(item, i));
  } else {
    // Group 1: EMEA Architecture Gaps (consciously selected)
    if (gapItems.length > 0) {
      addGroupHeader("⬛  EMEA ARCHITECTURE GAPS  (selected)", "C0392B");
      gapItems.slice(0, 7).forEach((item, i) => addOutRow(item, i));
      if (gapItems.length > 7) {
        if (outY + 0.22 <= maxY) {
          slide.addText(`  +${gapItems.length - 7} more…`, {
            x: ox + 0.1, y: outY, w: colW - 0.2, h: 0.22,
            fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, italic: true,
          });
          outY += 0.26;
        }
      }
    }
    // Group 2: Unselected AMS Capabilities (auto-derived)
    if (autoItems.length > 0) {
      addGroupHeader("⬜  UNSELECTED AMS CAPABILITIES  (review required)", "E67E22");
      autoItems.slice(0, 6).forEach((item, i) => addOutRow(item, i, i % 2 === 0 ? "FEF3E2" : COLORS.white));
      if (autoItems.length > 6) {
        if (outY + 0.22 <= maxY) {
          slide.addText(`  +${autoItems.length - 6} not yet configured…`, {
            x: ox + 0.1, y: outY, w: colW - 0.2, h: 0.22,
            fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, italic: true,
          });
          outY += 0.26;
        }
      }
    }
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 5 – RACI Matrix
// ──────────────────────────────────────────────
function addRACISlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "RACI Matrix", "Roles & Responsibilities", data);

  // Legend
  const legend = [
    { code: "R", label: "Responsible", color: COLORS.green },
    { code: "A", label: "Accountable", color: COLORS.sapDarkBlue },
    { code: "C", label: "Consulted", color: COLORS.orange },
    { code: "I", label: "Informed", color: COLORS.mutedGray },
  ];
  legend.forEach((l, i) => {
    const x = 0.28 + i * 3.1;
    slide.addShape("roundRect", { x, y: 1.38, w: 0.28, h: 0.28, fill: { color: l.color }, rectRadius: 0.04 });
    slide.addText(l.code, { x, y: 1.38, w: 0.28, h: 0.28, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(`= ${l.label}`, { x: x + 0.31, y: 1.40, w: 2.7, h: 0.24, fontSize: 8.5, color: COLORS.textGray, fontFace: FONT });
  });

  // Table headers
  const headers = ["Activity / Deliverable", "Responsible", "Accountable", "Consulted", "Informed"];
  const colWidths = [4.6, 2.0, 2.0, 2.0, 2.17];
  const tableX = 0.28;
  const headerY = 1.78;
  let xPos = tableX;

  headers.forEach((h, i) => {
    slide.addShape("rect", { x: xPos, y: headerY, w: colWidths[i], h: 0.36, fill: { color: COLORS.sapDarkBlue } });
    slide.addText(h, { x: xPos + 0.05, y: headerY, w: colWidths[i] - 0.1, h: 0.36, fontSize: 9, bold: true, color: COLORS.white, fontFace: FONT, align: i === 0 ? "left" : "center" });
    xPos += colWidths[i];
  });

  // RACI rows
  data.raciEntries.forEach((entry, i) => {
    const rowY = headerY + 0.36 + i * 0.38;
    if (rowY + 0.38 > 7.14) return;
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

  addSlideHeader(slide, "Dependencies", "Project & Technical Dependencies", data);

  const deps = data.dependencies.filter(Boolean);
  const iconColors = [COLORS.sapBlue, COLORS.orange, COLORS.green, COLORS.purple, COLORS.teal, COLORS.sapDarkBlue];

  deps.forEach((dep, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? 0.28 : 6.77;
    const y = 1.38 + row * 0.9;

    if (y + 0.85 > 7.14) return;

    const color = iconColors[i % iconColors.length];

    slide.addShape("roundRect", { x, y, w: 6.2, h: 0.78, fill: { color: COLORS.cardBg }, line: { color: COLORS.dividerGray, width: 0.4 }, rectRadius: 0.06 });
    slide.addShape("rect", { x, y, w: 0.025, h: 0.78, fill: { color } });
    slide.addShape("roundRect", { x: x + 0.08, y: y + 0.13, w: 0.32, h: 0.52, fill: { color }, rectRadius: 0.04 });
    slide.addText(`${i + 1}`, { x: x + 0.08, y: y + 0.13, w: 0.32, h: 0.52, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(dep, { x: x + 0.48, y: y + 0.15, w: 5.64, h: 0.48, fontSize: 10, color: COLORS.textGray, fontFace: FONT });
  });

  if (deps.length === 0) {
    slide.addText("No dependencies defined.", { x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 12, color: COLORS.mutedGray, fontFace: FONT, italic: true });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 7 – Assumptions
// ──────────────────────────────────────────────
function addAssumptionsSlide(pptx: PptxGenJS, data: FormData) {
  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });

  addSlideHeader(slide, "Assumptions & Constraints", "Project Assumptions", data);

  const assumptions = data.assumptions.filter(Boolean);

  assumptions.forEach((item, i) => {
    const y = 1.38 + i * 0.72;
    if (y + 0.65 > 7.14) return;

    slide.addShape("roundRect", { x: 0.28, y, w: 12.77, h: 0.62, fill: { color: i % 2 === 0 ? COLORS.cardBg : COLORS.white }, line: { color: COLORS.dividerGray, width: 0.3 }, rectRadius: 0.05 });

    // Number circle
    slide.addShape("ellipse", { x: 0.42, y: y + 0.2, w: 0.22, h: 0.22, fill: { color: COLORS.sapBlue } });
    slide.addText(`${i + 1}`, { x: 0.42, y: y + 0.2, w: 0.22, h: 0.22, fontSize: 8, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });

    slide.addText(item, { x: 0.75, y: y + 0.1, w: 12.2, h: 0.42, fontSize: 10, color: COLORS.textGray, fontFace: FONT });
  });

  if (assumptions.length === 0) {
    slide.addText("No assumptions defined.", { x: 0.5, y: 3, w: 9, h: 0.4, fontSize: 12, color: COLORS.mutedGray, fontFace: FONT, italic: true });
  }

  addSlideFooter(slide, data);
}

// ──────────────────────────────────────────────
// SLIDE 8 – Resource Loading
// ──────────────────────────────────────────────

/** Returns a hex fill colour based on allocation percentage (0–100) using an Accenture purple heatmap. */
function allocationColor(pct: number): string {
  if (pct === 0)  return "F2F2F2"; // empty – light grey
  if (pct <= 25)  return "E8D5F5"; // very light purple
  if (pct <= 50)  return "C49DDE"; // light-medium purple
  if (pct <= 75)  return "9B5CC4"; // medium purple
  return          "7900BF";        // full Accenture purple
}

/** Text colour that contrasts with the heatmap background. */
function allocationTextColor(pct: number): string {
  return pct > 50 ? "FFFFFF" : "0A1B3D";
}

function addResourceLoadingSlide(pptx: PptxGenJS, data: FormData) {
  const resources = data.resources.filter(r => r.role.trim());
  if (resources.length === 0) return;

  // Derive phases from the first resource entry (all entries share the same phase list)
  const phases = resources[0].allocations.map(a => a.phase);
  const phaseCount = phases.length;

  // Column layout: Role | Workstream | Type | ...phases
  const roleW      = 3.0;
  const wsW        = 1.5;
  const typeW      = 0.9;
  const phaseW     = (12.77 - roleW - wsW - typeW) / phaseCount;
  const tableX     = 0.28;
  const headerH    = 0.38;
  const rowH       = DENSITY.rowHeight;
  const startY     = 1.38;
  const maxRows    = Math.floor((7.0 - startY - headerH - 0.35) / rowH);
  const visResources = resources.slice(0, maxRows);

  const slide = pptx.addSlide();
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: COLORS.white } });
  addSlideHeader(slide, "Resource Loading Plan", "Effort Allocation by Phase (%)", data);

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
      slide.addText(`${fte}`, { x: sx, y: summaryY + 0.04, w: phaseW, h: rowH - 0.08, fontSize: 8.5, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
      sx += phaseW;
    });
  }

  // ── Legend ──
  const legendY = 6.80;
  const legend = [
    { label: "0%",       color: "F2F2F2", text: "0A1B3D" },
    { label: "1–25%",    color: "E8D5F5", text: "0A1B3D" },
    { label: "26–50%",   color: "C49DDE", text: "0A1B3D" },
    { label: "51–75%",   color: "9B5CC4", text: "FFFFFF" },
    { label: "76–100%",  color: "7900BF", text: "FFFFFF" },
  ];
  slide.addText("Allocation key:", { x: 0.28, y: legendY, w: 1.4, h: 0.24, fontSize: 7.5, color: COLORS.mutedGray, fontFace: FONT, italic: true });
  legend.forEach((l, i) => {
    const lx = 1.76 + i * 2.2;
    slide.addShape("roundRect", { x: lx, y: legendY + 0.02, w: 2.0, h: 0.20, fill: { color: l.color }, line: { color: COLORS.dividerGray, width: 0.3 }, rectRadius: 0.04 });
    slide.addText(l.label, { x: lx, y: legendY + 0.02, w: 2.0, h: 0.20, fontSize: 7, bold: true, color: l.text, fontFace: FONT, align: "center" });
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

  addSlideHeader(slide, "High-Level Timeline", "Project Phases & Milestones", data);

  const phases = [
    { name: "Project Preparation", icon: "📋", duration: "Wk 1–2", color: COLORS.teal },
    { name: "Blueprint / Fit-Gap", icon: "🔍", duration: "Wk 3–6", color: COLORS.sapBlue },
    { name: "Realization", icon: "⚙️", duration: "Wk 7–14", color: COLORS.orange },
    { name: "Testing", icon: "✅", duration: "Wk 15–18", color: COLORS.purple },
    { name: "Cutover & Go-Live", icon: "🚀", duration: "Wk 19–20", color: COLORS.green },
    { name: "Hypercare", icon: "🛡️", duration: "Wk 21–24", color: COLORS.sapDarkBlue },
  ];

  const totalW = 12.77;
  const boxW = totalW / phases.length - 0.08;
  const startX = 0.28;
  const lineY = 3.4;
  const boxY = 1.38;

  // Timeline connector line
  slide.addShape("rect", { x: startX, y: lineY + 0.6, w: totalW, h: 0.05, fill: { color: COLORS.dividerGray } });

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
    x: 0.28, y: 5.3, w: 12.77, h: 0.3,
    fontSize: 9, color: COLORS.mutedGray, fontFace: FONT, align: "center", italic: true,
  });

  // Products note
  slide.addText(`SAP Products: ${data.selectedProducts.map(p => p.name).join("  |  ")}`, {
    x: 0.28, y: 5.68, w: 12.77, h: 0.4,
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
  addSlideHeader(slide, "Implementation Approach", bp.implementationApproach.title, data);

  const phases = bp.implementationApproach.phases;
  const colCount = Math.min(phases.length, 3);
  const colW = 12.77 / colCount - 0.12;
  const startX = 0.28;
  const phaseColors = [COLORS.teal, COLORS.sapBlue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.sapDarkBlue];

  phases.slice(0, 6).forEach((ph, i) => {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = startX + col * (colW + 0.12);
    const y = 1.38 + row * 2.95;
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
  slide.addShape("roundRect", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.05 });
  slide.addText("AI-Generated Guidance", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

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
  addSlideHeader(slide, "Critical Success Factors", "Key factors for a successful implementation", data);

  const iconColors = [COLORS.sapBlue, COLORS.green, COLORS.orange, COLORS.purple, COLORS.teal, COLORS.sapDarkBlue, "C0392B"];
  const csf = bp.criticalSuccessFactors.slice(0, 8);
  const splitAt = Math.ceil(csf.length / 2);

  csf.forEach((item, idx) => {
    const col = idx < splitAt ? 0 : 1;
    const rowIdx = idx < splitAt ? idx : idx - splitAt;
    const x = col === 0 ? 0.28 : 6.77;
    const y = 1.38 + rowIdx * 0.9;
    if (y + 0.82 > 7.14) return;
    const color = iconColors[idx % iconColors.length];
    slide.addShape("roundRect", { x, y, w: 6.2, h: 0.82, fill: { color: COLORS.cardBg }, line: { color: COLORS.dividerGray, width: 0.4 }, rectRadius: 0.06 });
    slide.addShape("roundRect", { x: x + 0.08, y: y + 0.08, w: 0.34, h: 0.66, fill: { color }, rectRadius: 0.04 });
    slide.addText(`${idx + 1}`, { x: x + 0.08, y: y + 0.08, w: 0.34, h: 0.66, fontSize: 11, bold: true, color: COLORS.white, fontFace: FONT, align: "center" });
    slide.addText(item.factor, { x: x + 0.5, y: y + 0.07, w: 5.62, h: 0.25, fontSize: 9.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT });
    slide.addText(item.description, { x: x + 0.5, y: y + 0.33, w: 5.62, h: 0.44, fontSize: 8, color: COLORS.textGray, fontFace: FONT });
  });

  // Key recommendations strip
  if (bp.keyRecommendations.length > 0) {
    const recY = 6.65;
    slide.addShape("rect", { x: 0.28, y: recY, w: 12.77, h: 0.44, fill: { color: COLORS.cardBg }, line: { color: COLORS.dividerGray, width: 0.4 } });
    slide.addText("Key Recommendations:  " + bp.keyRecommendations.slice(0, 3).join("   •   "), {
      x: 0.38, y: recY + 0.02, w: 12.57, h: 0.4,
      fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, italic: true,
    });
  }

  // AI badge
  slide.addShape("roundRect", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.05 });
  slide.addText("AI-Generated Guidance", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

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
  addSlideHeader(slide, "Risk Register", "Identified Risks & Mitigation Strategies", data);

  const impactColors: Record<string, string> = { High: "C0392B", Medium: COLORS.orange, Low: COLORS.green };
  const probColors:   Record<string, string> = { High: "C0392B", Medium: COLORS.orange, Low: COLORS.teal };

  // Table headers
  const colWidths = [5.0, 1.2, 1.4, 5.17];
  const headers = ["Risk", "Impact", "Probability", "Mitigation Strategy"];
  const tableX = 0.28;
  const headerY = 1.38;
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
    const bpY = 6.65;
    slide.addShape("rect", { x: 0.28, y: bpY, w: 12.77, h: 0.44, fill: { color: COLORS.cardBg }, line: { color: COLORS.dividerGray, width: 0.4 } });
    slide.addText("Integration Best Practices:  " + bp.integrationBestPractices.slice(0, 2).join("   •   "), {
      x: 0.38, y: bpY + 0.04, w: 12.57, h: 0.36,
      fontSize: 7.5, color: COLORS.textGray, fontFace: FONT, italic: true,
    });
  }

  // AI badge
  slide.addShape("roundRect", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fill: { color: COLORS.accentGold }, rectRadius: 0.05 });
  slide.addText("AI-Generated Guidance", { x: 11.2, y: 1.38, w: 1.85, h: 0.24, fontSize: 6.5, bold: true, color: COLORS.sapDarkBlue, fontFace: FONT, align: "center" });

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
    addSlideHeader(slide, "AMS Service Catalog", chunks.length > 1 ? `Page ${pageIdx + 1} of ${chunks.length}` : "Service Overview", data);

    const tableX = 0.28;
    const headerH = 0.38;
    const rowH = DENSITY.rowHeight;
    const startY = 1.38;
    const colWidths = [2.0, 3.2, 1.8, 1.2, 1.4, 3.17];
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
  addSlideHeader(slide, "Commercial Shape", "Engagement Model & Commercial Terms", data);

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

  const tableX = 0.28;
  const labelW = 4.0;
  const valueW = 8.77;
  const rH = 0.42;

  rows.forEach(([label, value], i) => {
    const rowY = 1.38 + i * (rH + 0.04);
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
  addSlideHeader(slide, "Client Context", "Background & Strategic Context", data);

  // Decorative left bar
  slide.addShape("rect", { x: 0.28, y: 1.38, w: 0.025, h: 5.7, fill: { color: COLORS.sapBlue } });

  // Render text verbatim — split into paragraphs for readable wrapping
  const paragraphs = ctx.split(/\n{1,}/).filter(p => p.trim());
  let curY = 1.38;
  const textX = 0.48;
  const textW = 12.5;
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
  addSlideHeader(slide, "AMS Service Overview", "Application Management Services", data);

  // ── KPI metric cards row ──────────────────────────
  const kpis: Array<{ label: string; value: string; sub?: string; color: string }> = [
    { label: "Total Users",        value: a.totalUsers       || "—", sub: a.namedUsers ? `${a.namedUsers} named` : undefined, color: COLORS.sapDarkBlue },
    { label: "Concurrent Users",   value: a.concurrentUsers  || "—", color: COLORS.sapBlue },
    { label: "Support Hours",      value: a.supportHours,             color: COLORS.teal },
    { label: "Availability",       value: a.availability,             color: COLORS.green },
    { label: "Contract Duration",  value: a.contractDuration,         color: COLORS.orange },
  ];
  const kpiW = 12.77 / kpis.length - 0.1;
  kpis.forEach((k, i) => {
    const x = 0.28 + i * (kpiW + 0.1);
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
  const colY = 2.6;
  const colH = 4.5;
  const lx = 0.28;
  const lw = 6.1;

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
  const rx2 = 6.77;
  const rw = 6.28;

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
// Dark-slide footer (for domain view slides)
// ──────────────────────────────────────────────
function addDarkSlideFooter(slide: PptxGenJS.Slide, data: FormData) {
  _slideNumber++;
  slide.addShape("rect", { x: 0.3, y: 7.16, w: 12.7, h: 0.005, fill: { color: "30363D" } });
  slide.addText(`${data.projectName}  ·  v${data.version}  ·  ${data.preparedBy}`, {
    x: 0.3, y: 7.22, w: 8.5, h: 0.2,
    fontSize: 7.5, color: "7D8590", fontFace: FONT,
  });
  if (SHOW_SLIDE_NUMBERS) {
    slide.addText(String(_slideNumber), {
      x: 12.0, y: 7.22, w: 1.0, h: 0.2,
      fontSize: 7.5, color: "7D8590", fontFace: FONT, align: "right",
    });
  }
}

// ──────────────────────────────────────────────
// Capability Domain View Slides (dark, reference-style)
// One slide per AMS section that has selected capabilities
// ──────────────────────────────────────────────
function nodeLeafTexts(node: { text: string; children?: { text: string; children?: unknown[] }[] }): string[] {
  if (!node.children?.length) return [node.text];
  return node.children.flatMap(c => nodeLeafTexts(c as typeof node));
}

function addCapabilityDomainSlides(pptx: PptxGenJS, data: FormData) {
  const caps = data.selectedCapabilities!;
  const hex = (c: string) => c.replace("#", "");

  AMS_ARCHITECTURE.forEach((sec, secIdx) => {
    const secLeaves = sec.tree.flatMap(n => nodeLeafTexts(n));
    const selected = secLeaves.filter(t => caps.has(t));
    if (selected.length === 0) return;

    const slide = pptx.addSlide();

    // Full dark background
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "0D1117" } });

    // Blue accent strip at top
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: "4C8DFF" } });

    // Section number box
    slide.addShape("roundRect", {
      x: 0.28, y: 0.18, w: 0.52, h: 0.52,
      fill: { color: "1E2A3A" }, rectRadius: 0.07,
    });
    slide.addText(String(secIdx + 1).padStart(2, "0"), {
      x: 0.28, y: 0.18, w: 0.52, h: 0.52,
      fontSize: 18, bold: true, color: "4C8DFF", fontFace: FONT, align: "center",
    });

    // Domain name
    slide.addText(sec.section, {
      x: 0.94, y: 0.18, w: 8.5, h: 0.34,
      fontSize: 22, bold: true, color: "E6EDF3", fontFace: FONT,
    });

    // Subtitle
    slide.addText("SAP AMS Architecture · Capabilities in Scope", {
      x: 0.94, y: 0.52, w: 8.5, h: 0.2,
      fontSize: 9, color: "7D8590", fontFace: FONT,
    });

    // Right: selected / total badge
    slide.addShape("roundRect", {
      x: 10.2, y: 0.22, w: 3.0, h: 0.44,
      fill: { color: hex(sec.color) + "22" }, rectRadius: 0.07,
    });
    slide.addText(`${selected.length} / ${secLeaves.length} selected`, {
      x: 10.2, y: 0.22, w: 3.0, h: 0.44,
      fontSize: 9, bold: true, color: hex(sec.color), fontFace: FONT, align: "center",
    });

    // Colour divider under header
    slide.addShape("rect", {
      x: 0.28, y: 0.82, w: 12.7, h: 0.025,
      fill: { color: hex(sec.color) },
    });

    // Two-column capability list
    const cellH = 0.27;
    const gapH  = 0.035;
    const startY = 0.95;
    const colW  = 6.05;
    const col2X = 0.28 + colW + 0.22;
    const maxPerCol = Math.floor((7.1 - startY) / (cellH + gapH));

    selected.slice(0, maxPerCol * 2).forEach((cap, i) => {
      const col    = i < maxPerCol ? 0 : 1;
      const rowIdx = i < maxPerCol ? i : i - maxPerCol;
      const x = col === 0 ? 0.28 : col2X;
      const y = startY + rowIdx * (cellH + gapH);
      const bg = rowIdx % 2 === 0 ? "141C25" : "1A2332";

      slide.addShape("roundRect", { x, y, w: colW, h: cellH, fill: { color: bg }, rectRadius: 0.04 });

      // Dot accent
      slide.addShape("ellipse", {
        x: x + 0.1, y: y + (cellH - 0.1) / 2,
        w: 0.1, h: 0.1,
        fill: { color: hex(sec.color) },
      });

      slide.addText(cap, {
        x: x + 0.28, y: y + 0.035, w: colW - 0.36, h: cellH - 0.07,
        fontSize: 8, color: "C9D1D9", fontFace: FONT,
      });
    });

    if (selected.length > maxPerCol * 2) {
      slide.addText(`+${selected.length - maxPerCol * 2} more…`, {
        x: 0.28, y: 7.08, w: 6, h: 0.18,
        fontSize: 7.5, color: "7D8590", fontFace: FONT, italic: true,
      });
    }

    addDarkSlideFooter(slide, data);
  });
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
  if (data.selectedCapabilities?.size) addCapabilityDomainSlides(pptx, data);
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
