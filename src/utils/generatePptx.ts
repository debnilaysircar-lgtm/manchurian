import PptxGenJS from "pptxgenjs";
import type { SAPProduct } from "../data/sapProducts";

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
  preparedBy: string;
  version: string;
}

// Brand colors
const COLORS = {
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

const FONT = "Calibri";

function addSlideHeader(slide: PptxGenJS.Slide, title: string, subtitle?: string) {
  // Header bar
  slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.9, fill: { color: COLORS.sapDarkBlue } });
  // SAP accent stripe
  slide.addShape("rect", { x: 0, y: 0.9, w: "100%", h: 0.06, fill: { color: COLORS.sapBlue } });

  slide.addText(title, {
    x: 0.35, y: 0.12, w: 8.5, h: 0.65,
    fontSize: 22, bold: true, color: COLORS.white, fontFace: FONT,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.6, w: 8.5, h: 0.35,
      fontSize: 11, color: COLORS.accentGold, fontFace: FONT, italic: true,
    });
  }
}

function addSlideFooter(slide: PptxGenJS.Slide, data: FormData) {
  slide.addShape("rect", { x: 0, y: 7.2, w: "100%", h: 0.3, fill: { color: COLORS.medGray } });
  slide.addText(`${data.projectName}  |  v${data.version}  |  Prepared by: ${data.preparedBy}`, {
    x: 0.3, y: 7.22, w: 7, h: 0.25,
    fontSize: 8, color: COLORS.textGray, fontFace: FONT,
  });
  slide.addText(`CONFIDENTIAL`, {
    x: 7.8, y: 7.22, w: 2, h: 0.25,
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

  // SAP Logo text
  slide.addText("SAP", {
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
// SLIDE 8 – Timeline Overview
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
// Main export function
// ──────────────────────────────────────────────
export async function generatePptx(data: FormData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = data.projectName;
  pptx.subject = "SAP Solution Architecture";
  pptx.author = data.preparedBy;
  pptx.company = data.client;

  addTitleSlide(pptx, data);
  addProductsSlide(pptx, data);
  addLandscapeSlide(pptx, data);
  addScopeSlide(pptx, data);
  addRACISlide(pptx, data);
  addDependenciesSlide(pptx, data);
  addAssumptionsSlide(pptx, data);
  addTimelineSlide(pptx, data);

  const filename = `${data.projectName.replace(/\s+/g, "_")}_Solution_Architecture.pptx`;
  await pptx.writeFile({ fileName: filename });
}
