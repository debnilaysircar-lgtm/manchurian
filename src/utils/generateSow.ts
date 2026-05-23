import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle,
  ShadingType, Header, Footer, PageNumber,
  convertInchesToTwip, LevelFormat,
} from "docx";
import type { FormData } from "./generatePptx";

// ── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  sapBlue:     "0070F2",
  sapDark:     "003D73",
  accentGold:  "F0AB00",
  lightBlue:   "EBF5FB",
  lightGray:   "F8F9FA",
  medGray:     "DEE2E6",
  darkGray:    "343A40",
  red:         "C0392B",
  orange:      "E9730C",
  green:       "107E3E",
  white:       "FFFFFF",
};

function h1(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.sapBlue, space: 4 } },
  });
}

function h2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function para(text: string, opts?: { bold?: boolean; italic?: boolean; color?: string; size?: number }): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text,
      bold: opts?.bold,
      italics: opts?.italic,
      color: opts?.color,
      size: opts?.size ?? 22,
      font: "Calibri",
    })],
    spacing: { after: 120 },
  });
}

function bullet(text: string, level = 0): Paragraph {
  return new Paragraph({
    text,
    bullet: { level },
    spacing: { after: 80 },
  });
}

function spacer(): Paragraph {
  return new Paragraph({ text: "", spacing: { after: 60 } });
}

function headerRow(cells: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: cells.map(c => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: c, bold: true, color: C.white, size: 20, font: "Calibri" })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.CLEAR, fill: C.sapDark, color: C.sapDark },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
    })),
  });
}

function dataRow(cells: string[], shade = false): TableRow {
  return new TableRow({
    children: cells.map((c, i) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: c || "—", size: 20, font: "Calibri" })],
        alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
      })],
      shading: shade ? { type: ShadingType.CLEAR, fill: C.lightBlue, color: C.lightBlue } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    })),
  });
}

// ── Main SoW generator ───────────────────────────────────────────────────────

export async function generateSow(data: FormData): Promise<void> {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const products = data.selectedProducts.map(p => p.name);
  const systems  = data.systems.filter(s => s.enabled).map(s => s.name);
  const ams      = data.amsData;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = [
    {
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1.2),
            bottom: convertInchesToTwip(1.0),
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: data.projectName, bold: true, size: 18, color: C.sapDark, font: "Calibri" }),
                new TextRun({ text: "   |   Statement of Work   |   ", size: 18, color: "666666", font: "Calibri" }),
                new TextRun({ text: `v${data.version}`, size: 18, color: "666666", font: "Calibri" }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.sapBlue, space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${data.client || "Client"}  |  Prepared by: ${data.preparedBy || "—"}  |  `, size: 16, color: "666666", font: "Calibri" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "666666", font: "Calibri" }),
                new TextRun({ text: " / ", size: 16, color: "666666", font: "Calibri" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "666666", font: "Calibri" }),
                new TextRun({ text: "   |   CONFIDENTIAL", size: 16, color: "666666", font: "Calibri" }),
              ],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.medGray, space: 4 } },
            }),
          ],
        }),
      },
      children: [
        // ── Cover page ──────────────────────────────────────────────────────
        new Paragraph({
          children: [new TextRun({ text: "", size: 48 })],
          spacing: { before: 1400, after: 0 },
        }),
        new Paragraph({
          children: [new TextRun({ text: "STATEMENT OF WORK", bold: true, size: 56, color: C.sapDark, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: data.projectName, bold: true, size: 40, color: C.sapBlue, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 600 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Prepared for: ${data.client || "—"}`, size: 26, color: C.darkGray, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Prepared by: ${data.preparedBy || "—"}`, size: 26, color: C.darkGray, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Version: ${data.version}   |   Date: ${today}`, size: 24, color: "888888", font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
        }),

        // ── Page break ──────────────────────────────────────────────────────
        new Paragraph({ pageBreakBefore: true, text: "" }),

        // ── 1. Document Control ──────────────────────────────────────────────
        h1("1. Document Control"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(["Field", "Value"]),
            dataRow(["Document Title", `Statement of Work — ${data.projectName}`]),
            dataRow(["Client", data.client || "—"], true),
            dataRow(["Project Manager", data.projectManager || "—"]),
            dataRow(["Prepared By", data.preparedBy || "—"], true),
            dataRow(["Version", data.version]),
            dataRow(["Date", today], true),
          ],
        }),
        spacer(),

        // ── 2. Executive Summary ─────────────────────────────────────────────
        h1("2. Executive Summary"),
        data.clientContext
          ? para(data.clientContext)
          : para(`This Statement of Work (SoW) defines the scope, responsibilities, timelines, and commercial terms for the implementation of ${products.join(", ")} for ${data.client || "the client"}. The engagement will follow the SAP Activate methodology and deliver a fully configured, tested, and operational SAP landscape.`),
        spacer(),

        // ── 3. SAP Products in Scope ─────────────────────────────────────────
        h1("3. SAP Products in Scope"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(["#", "Product Name", "Category", "Description"]),
            ...data.selectedProducts.map((p, i) =>
              dataRow([String(i + 1), p.name, p.category, p.description], i % 2 === 1)
            ),
          ],
        }),
        spacer(),

        // ── 4. System Landscape ──────────────────────────────────────────────
        h1("4. System Landscape"),
        para(`The following environments will be provisioned as part of this engagement:`),
        ...systems.map(s => bullet(s)),
        spacer(),

        // ── 5. Project Scope ─────────────────────────────────────────────────
        h1("5. Project Scope"),
        h2("5.1 In Scope"),
        ...(data.scopeItems.filter(Boolean).map(s => bullet(s))),
        spacer(),
        h2("5.2 Out of Scope"),
        ...([
          "Custom development beyond agreed and documented specifications",
          "Data migration from non-SAP legacy systems not listed in this SoW",
          "Third-party system integrations not listed in this document",
          "End-user hardware, infrastructure, or network provisioning",
          "Production support beyond the contracted hypercare period",
          "Regulatory, legal, or compliance advisory services",
        ].map(s => bullet(s))),
        spacer(),

        // ── 6. RACI Matrix ────────────────────────────────────────────────────
        h1("6. Roles and Responsibilities (RACI)"),
        para("R = Responsible   A = Accountable   C = Consulted   I = Informed", { italic: true, color: "666666", size: 20 }),
        spacer(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(["Activity / Deliverable", "Responsible", "Accountable", "Consulted", "Informed"]),
            ...data.raciEntries.map((e, i) =>
              dataRow([e.activity, e.responsible, e.accountable, e.consulted, e.informed], i % 2 === 1)
            ),
          ],
        }),
        spacer(),

        // ── 7. Dependencies ───────────────────────────────────────────────────
        h1("7. Dependencies"),
        ...data.dependencies.filter(Boolean).map(d => bullet(d)),
        spacer(),

        // ── 8. Assumptions ────────────────────────────────────────────────────
        h1("8. Assumptions"),
        ...data.assumptions.filter(Boolean).map(a => bullet(a)),
        spacer(),

        // ── 9. Resource Loading ───────────────────────────────────────────────
        ...(data.resources.length > 0 ? [
          h1("9. Resource Plan"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Role", "Workstream", "Type", ...( data.resources[0]?.allocations.map(a => a.phase) ?? [] )]),
              ...data.resources.map((r, i) =>
                dataRow([r.role, r.workstream, r.type, ...r.allocations.map(a => a.percent > 0 ? `${a.percent}%` : "—")], i % 2 === 1)
              ),
            ],
          }),
          spacer(),
        ] : [
          h1("9. Resource Plan"),
          para("Resource plan to be agreed and appended as Exhibit A."),
          spacer(),
        ]),

        // ── 10. AMS Service Parameters ────────────────────────────────────────
        ...(ams ? [
          h1("10. Application Management Services (AMS)"),
          h2("10.1 Service Parameters"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Parameter", "Value"]),
              dataRow(["Total Users", ams.totalUsers || "—"]),
              dataRow(["Named / Active Users", ams.namedUsers || "—"], true),
              dataRow(["Concurrent Users", ams.concurrentUsers || "—"]),
              dataRow(["Support Model", ams.supportModel], true),
              dataRow(["Support Hours", ams.supportHours]),
              dataRow(["Support Languages", ams.supportLanguages || "—"], true),
              dataRow(["Onshore / Offshore Split", `${ams.onshorePercent || "—"}% / ${ams.offshorePercent || "—"}%`]),
              dataRow(["Monthly Ticket Volume (est.)", ams.monthlyTickets], true),
              dataRow(["Monthly Change Requests (est.)", ams.monthlyChanges || "—"]),
              dataRow(["Hypercare Duration", ams.hypercareDuration ? `${ams.hypercareDuration} weeks` : "—"], true),
              dataRow(["Training Hours", ams.trainingHours || "—"]),
              dataRow(["Contract Duration", ams.contractDuration], true),
              dataRow(["System Availability Target", ams.availability]),
              dataRow(["Service Review Frequency", ams.reviewFrequency], true),
              dataRow(["Dedicated Support Contacts", ams.dedicatedContacts || "—"]),
            ],
          }),
          spacer(),
          h2("10.2 SLA Targets"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              headerRow(["Priority", "Description", "Response Time"]),
              dataRow(["P1 — Critical", "System down / complete loss of business function", ams.slaP1]),
              dataRow(["P2 — High", "Major functional impact, workaround available", ams.slaP2], true),
              dataRow(["P3 — Medium", "Partial impact, workaround exists", ams.slaP3]),
              dataRow(["P4 — Low", "Minor / cosmetic issue", ams.slaP4], true),
            ],
          }),
          spacer(),
          h2("10.3 Escalation Path"),
          para(ams.escalationPath || "L1 Support → L2 Application Support → L3 Solution Architects → SAP Support"),
          ...(ams.exclusions ? [h2("10.4 Exclusions"), para(ams.exclusions)] : []),
          ...(ams.additionalNotes ? [h2("10.5 Additional Notes"), para(ams.additionalNotes)] : []),
          spacer(),
        ] : []),

        // ── 11. Commercial Terms ──────────────────────────────────────────────
        h1(`${ams ? "11" : "10"}. Commercial Terms`),
        para("The following commercial terms apply to this engagement. Detailed pricing will be captured in the associated commercial schedule."),
        spacer(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(["Term", "Detail"]),
            dataRow(["Engagement Model", "Fixed Price / Time & Materials (to be agreed)"]),
            dataRow(["Payment Schedule", "Milestone-based (30% mobilisation, 40% delivery, 30% go-live)"], true),
            dataRow(["Expense Policy", "Reasonable travel and subsistence at cost, pre-approved"]),
            dataRow(["Change Control", "Changes to scope require written Change Request signed by both parties"], true),
            dataRow(["Warranty Period", "30 days post go-live for severity 1 defects"]),
            dataRow(["Governing Law", "To be agreed"], true),
          ],
        }),
        spacer(),

        // ── 12. Sign-Off ──────────────────────────────────────────────────────
        h1(`${ams ? "12" : "11"}. Authorisation & Sign-Off`),
        para("This Statement of Work is agreed and accepted by the authorised representatives of both parties:"),
        spacer(),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            headerRow(["", "Service Provider", "Client"]),
            dataRow(["Name", "", ""]),
            dataRow(["Title", "", ""], true),
            dataRow(["Signature", "", ""]),
            dataRow(["Date", "", ""], true),
          ],
        }),
        spacer(),
        para("By signing above, both parties agree to the terms and conditions set forth in this Statement of Work.", { italic: true, color: "888888", size: 18 }),
      ],
    },
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
      ],
    },
    styles: {
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: C.sapDark, font: "Calibri" },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: C.sapBlue, font: "Calibri" },
          paragraph: { spacing: { before: 280, after: 120 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: C.darkGray, font: "Calibri" },
          paragraph: { spacing: { before: 200, after: 80 } },
        },
      ],
    },
    sections,
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.projectName.replace(/\s+/g, "_")}_Statement_of_Work.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
