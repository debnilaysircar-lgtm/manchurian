import { useState, useEffect, useMemo } from "react";
import ProductSearch from "./ProductSearch";
import ConfigPanel from "./ConfigPanel";
import CapabilitiesPicker from "./CapabilitiesPicker";
import GapPicker from "./GapPicker";
import type { SAPProduct } from "../data/sapProducts";
import type { RACIEntry, SystemEnvironment, ResourceEntry } from "../utils/generatePptx";
import { generatePptx } from "../utils/generatePptx";
import { generateResourcesFromProducts, PHASE_LABELS } from "../data/resourceMapping";
import { fetchBestPractices } from "../utils/fetchBestPractices";
import type { BestPracticesResponse } from "../utils/fetchBestPractices";
import { autoGenerate } from "../utils/autoGenerate";
import { generateSow } from "../utils/generateSow";
import { fetchServiceCatalog } from "../utils/fetchServiceCatalog";
import { fetchAutoResources } from "../utils/fetchAutoResources";
import type { ServiceCatalogEntry, ServiceCategory, ServiceTier } from "../types/serviceCatalog";
import type { CommercialShape } from "../utils/generatePptx";
import type { OutputConfig } from "../types/outputConfig";
import { DEFAULT_CONFIG, THEME_PALETTES } from "../types/outputConfig";
import type { AMSData } from "../types/amsData";
import { DEFAULT_AMS } from "../types/amsData";
import { AMS_ARCHITECTURE } from "../data/amsArchitectureData";

const DEFAULT_SYSTEMS: SystemEnvironment[] = [
  { name: "Sandbox", enabled: false, description: "Exploration & PoC testing" },
  { name: "Development", enabled: true, description: "Active development & config" },
  { name: "Test", enabled: true, description: "QA & integration testing" },
  { name: "Quality Assurance", enabled: false, description: "User acceptance testing" },
  { name: "User Acceptance Testing", enabled: false, description: "Business validation" },
  { name: "Production", enabled: true, description: "Live business operations" },
];

const DEFAULT_RACI: RACIEntry[] = [
  { activity: "Project Governance & Steering", responsible: "PM", accountable: "A", consulted: "C", informed: "I" },
  { activity: "SAP Configuration & Setup", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Business Process Design", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Data Migration", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Integration Design & Build", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Testing (SIT/UAT)", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "User Training & Change Mgmt", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
  { activity: "Go-Live Approval", responsible: "R", accountable: "A", consulted: "C", informed: "I" },
];

const DEFAULT_SCOPE = [
  "SAP system configuration and customization",
  "Business process workshops and blueprint",
  "Data migration from source systems",
  "Integration with third-party applications",
  "User acceptance testing (UAT) support",
  "End-user training and documentation",
  "Go-live cutover planning and execution",
  "Post go-live hypercare support (4 weeks)",
];

const DEFAULT_DEPS = [
  "Client IT infrastructure and network readiness",
  "SAP license procurement and activation",
  "Legacy system access for data extraction",
  "Business stakeholder availability for workshops",
  "Approved business process documentation",
  "Third-party vendor API specifications",
];

const DEFAULT_ASSUMPTIONS = [
  "Client will provide dedicated business process owners for all workstreams",
  "SAP licenses are procured and activated prior to project kick-off",
  "Source system data quality will be validated by the client team",
  "Change management and communication activities are client-led",
  "Project timeline assumes no major scope changes after blueprint phase",
  "All environments will be provisioned per the agreed system landscape",
  "Business sign-off on design documents will be completed within 5 business days",
];

type Step = "basics" | "products" | "capabilities" | "systems" | "scope" | "raci" | "dependencies" | "assumptions" | "resources" | "ams" | "catalog" | "commercial" | "review";
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "basics",        label: "Project Info",   icon: "📁" },
  { key: "products",      label: "SAP Products",   icon: "🔧" },
  { key: "capabilities",  label: "Capabilities",   icon: "🏗️" },
  { key: "systems",       label: "Systems",         icon: "🖥️" },
  { key: "scope",         label: "Scope",           icon: "📋" },
  { key: "raci",          label: "RACI",            icon: "👥" },
  { key: "dependencies",  label: "Dependencies",    icon: "🔗" },
  { key: "assumptions",   label: "Assumptions",     icon: "💡" },
  { key: "resources",     label: "Resources",       icon: "📊" },
  { key: "ams",           label: "AMS",             icon: "🛎️" },
  { key: "catalog",       label: "Catalog",         icon: "📂" },
  { key: "commercial",    label: "Commercial",      icon: "💰" },
  { key: "review",        label: "Generate",        icon: "⬇️" },
];

// Shared auto-generate banner used on scope/RACI/deps/assumptions steps
function AutoGenBanner({
  ready, loading, error, onGenerate, label,
}: {
  ready: boolean; loading: boolean; error: string | null;
  onGenerate: () => void; label: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-4 py-3">
      <span className="text-xl flex-shrink-0">✨</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-900">{label}</p>
        {error && <p className="text-xs text-red-600 mt-0.5 truncate">⚠ {error}</p>}
        {!error && <p className="text-xs text-amber-600 mt-0.5">All four fields (scope, RACI, dependencies, assumptions) are regenerated at once.</p>}
      </div>
      <button
        onClick={onGenerate}
        disabled={!ready || loading}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          !ready ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : loading ? "bg-amber-200 text-amber-700 cursor-wait"
          : "bg-amber-500 hover:bg-amber-600 text-white"
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Generating…
          </>
        ) : "⚡ Auto-generate"}
      </button>
    </div>
  );
}

// Colour scale matching the PPTX heatmap
function heatBg(pct: number): string {
  if (pct === 0)   return "#F2F2F2";
  if (pct <= 25)   return "#D6E8FA";
  if (pct <= 50)   return "#90C4F5";
  if (pct <= 75)   return "#3D9BE9";
  return                  "#0070F2";
}
function heatText(pct: number): string {
  return pct > 50 ? "#FFFFFF" : "#003D73";
}

export default function SAPSlideGenerator() {
  const [step, setStep] = useState<Step>("basics");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [fetchingAI, setFetchingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [bestPractices, setBestPractices] = useState<BestPracticesResponse | null>(null);
  const [includeAI, setIncludeAI] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [outputConfig, setOutputConfig] = useState<OutputConfig>(DEFAULT_CONFIG);

  const [projectName, setProjectName] = useState("SAP Implementation Project");
  const [client, setClient] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [version, setVersion] = useState("1.0");

  const [selectedProducts, setSelectedProducts] = useState<SAPProduct[]>([]);
  const [systems, setSystems] = useState<SystemEnvironment[]>(DEFAULT_SYSTEMS);
  const [scopeItems, setScopeItems] = useState<string[]>(DEFAULT_SCOPE);
  const [raciEntries, setRaciEntries] = useState<RACIEntry[]>(DEFAULT_RACI);
  const [dependencies, setDependencies] = useState<string[]>(DEFAULT_DEPS);
  const [assumptions, setAssumptions] = useState<string[]>(DEFAULT_ASSUMPTIONS);
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [amsData, setAmsData] = useState<AMSData>(DEFAULT_AMS);
  const [clientContext, setClientContext] = useState("");
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenError, setAutoGenError] = useState<string | null>(null);
  const [downloadingSow, setDownloadingSow] = useState(false);
  const [generatedSow, setGeneratedSow] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogEntry[]>([]);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [fetchingResources, setFetchingResources] = useState(false);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  // Per-product capability selections: productId → Set<capabilityLeafText>
  const [capsByProduct, setCapsByProduct] = useState<Map<string, Set<string>>>(new Map());
  const [outOfScopeGaps, setOutOfScopeGaps] = useState<Set<string>>(new Set());

  // Union of all selected capabilities (for domain slides)
  const selectedCapabilities = useMemo(() => {
    const union = new Set<string>();
    capsByProduct.forEach(caps => caps.forEach(t => union.add(t)));
    return union;
  }, [capsByProduct]);

  // AMS capabilities NOT selected in any product → auto out-of-scope
  const autoOutOfScope = useMemo(() => {
    if (selectedCapabilities.size === 0) return new Set<string>();
    const allLeaves = AMS_ARCHITECTURE.flatMap(s =>
      s.tree.flatMap(function walk(n: { text: string; children?: typeof n[] }): string[] {
        return n.children?.length ? n.children.flatMap(walk) : [n.text];
      })
    );
    return new Set(allLeaves.filter(t => !selectedCapabilities.has(t)));
  }, [selectedCapabilities]);

  // Which AMS domains have at least one capability selected (drives resource rows)
  const capDomains = useMemo(() => {
    function walk(n: { text: string; children?: typeof n[] }): string[] {
      return n.children?.length ? n.children.flatMap(walk) : [n.text];
    }
    const basisLeaves   = new Set(AMS_ARCHITECTURE[0].tree.flatMap(walk));
    const secLeaves     = new Set(AMS_ARCHITECTURE[1].tree.flatMap(walk));
    const solmanLeaves  = new Set(AMS_ARCHITECTURE[2]?.tree.flatMap(walk) ?? []);
    return {
      hasBasis:    [...selectedCapabilities].some(t => basisLeaves.has(t)),
      hasSecurity: [...selectedCapabilities].some(t => secLeaves.has(t)),
      hasSolMan:   [...selectedCapabilities].some(t => solmanLeaves.has(t)),
    };
  }, [selectedCapabilities]);
  const [commercialShape, setCommercialShape] = useState<CommercialShape>({
    engagementModel: "Fixed Price",
    currency: "USD",
    totalValue: "",
    paymentTerms: "Net 30",
    paymentSchedule: "30% mobilisation, 40% delivery, 30% go-live",
    expensePolicy: "Reasonable travel and subsistence at cost, pre-approved",
    warrantyPeriod: "30 days post go-live for severity 1 defects",
    governingLaw: "",
    noticeperiod: "30 days written notice",
    penaltyClauses: "",
    additionalTerms: "",
  });

  // Auto-generate resources when entering the resources step
  useEffect(() => {
    if (step === "resources" && resources.length === 0 && selectedProducts.length > 0) {
      setResources(generateResourcesFromProducts(selectedProducts.map(p => p.id), capDomains));
    }
  }, [step]);

  const currentIndex = STEPS.findIndex(s => s.key === step);

  async function fetchAIContent() {
    if (!includeAI || selectedProducts.length === 0) return;
    setFetchingAI(true);
    setAiError(null);
    try {
      const result = await fetchBestPractices(selectedProducts.map(p => p.name), projectName);
      setBestPractices(result);
    } catch (err) {
      setAiError(String(err));
    } finally {
      setFetchingAI(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerated(false);
    try {
      let bp = bestPractices;
      if (includeAI && !bp && selectedProducts.length > 0) {
        setFetchingAI(true);
        try {
          bp = await fetchBestPractices(selectedProducts.map(p => p.name), projectName);
          setBestPractices(bp);
        } catch (err) {
          setAiError(String(err));
          bp = null;
        } finally {
          setFetchingAI(false);
        }
      }
      const formData = { projectName, client, projectManager, preparedBy, version, selectedProducts, systems, scopeItems, raciEntries, dependencies, assumptions, resources, bestPractices: bp ?? undefined, outputConfig, amsData, clientContext, serviceCatalog: serviceCatalog.length ? serviceCatalog : undefined, commercialShape, selectedCapabilities: selectedCapabilities.size ? selectedCapabilities : undefined, outOfScopeGaps: outOfScopeGaps.size ? outOfScopeGaps : undefined, autoOutOfScope: autoOutOfScope.size ? autoOutOfScope : undefined };
      await generatePptx(formData);
      setGenerated(true);
    } catch (err) {
      console.error(err);
      alert("Error generating PPTX. Check the browser console.");
    } finally {
      setGenerating(false);
      setFetchingAI(false);
    }
  }

  async function handleAutoGenerate() {
    if (selectedProducts.length === 0) return;
    setAutoGenerating(true);
    setAutoGenError(null);
    try {
      const result = await autoGenerate(
        selectedProducts.map(p => p.name),
        projectName,
        clientContext,
        outputConfig.aiTone,
      );
      if (result.scopeItems?.length)  setScopeItems(result.scopeItems);
      if (result.raciEntries?.length) setRaciEntries(result.raciEntries);
      if (result.dependencies?.length) setDependencies(result.dependencies);
      if (result.assumptions?.length) setAssumptions(result.assumptions);
    } catch (err) {
      setAutoGenError(String(err));
    } finally {
      setAutoGenerating(false);
    }
  }

  async function handleFetchCatalog() {
    if (selectedProducts.length === 0) return;
    setFetchingCatalog(true);
    setCatalogError(null);
    try {
      const result = await fetchServiceCatalog(selectedProducts.map(p => p.name), projectName, clientContext);
      setServiceCatalog(result);
    } catch (err) {
      setCatalogError(String(err));
    } finally {
      setFetchingCatalog(false);
    }
  }

  async function handleAIResources() {
    if (selectedProducts.length === 0) return;
    setFetchingResources(true);
    setResourcesError(null);
    try {
      const result = await fetchAutoResources(
        selectedProducts.map(p => p.name),
        projectName,
        clientContext,
      );
      setResources(result);
    } catch (err) {
      setResourcesError(String(err));
    } finally {
      setFetchingResources(false);
    }
  }

  async function handleDownloadSow() {
    setDownloadingSow(true);
    setGeneratedSow(false);
    try {
      await generateSow({ projectName, client, projectManager, preparedBy, version, selectedProducts, systems, scopeItems, raciEntries, dependencies, assumptions, resources, amsData, clientContext, bestPractices: bestPractices ?? undefined, outputConfig, serviceCatalog: serviceCatalog.length ? serviceCatalog : undefined, commercialShape });
      setGeneratedSow(true);
    } catch (err) {
      console.error(err);
      alert("Error generating SoW. Check the browser console.");
    } finally {
      setDownloadingSow(false);
    }
  }

  function updateListItem(list: string[], setList: (v: string[]) => void, idx: number, val: string) {
    const updated = [...list]; updated[idx] = val; setList(updated);
  }
  function addListItem(list: string[], setList: (v: string[]) => void) { setList([...list, ""]); }
  function removeListItem(list: string[], setList: (v: string[]) => void, idx: number) { setList(list.filter((_, i) => i !== idx)); }

  function updateRaciEntry(idx: number, field: keyof RACIEntry, val: string) {
    const updated = [...raciEntries]; updated[idx] = { ...updated[idx], [field]: val }; setRaciEntries(updated);
  }
  function toggleSystem(idx: number) {
    const updated = [...systems]; updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled }; setSystems(updated);
  }

  function updateResourceField(idx: number, field: "role" | "workstream" | "type", val: string) {
    const updated = [...resources];
    updated[idx] = { ...updated[idx], [field]: val } as ResourceEntry;
    setResources(updated);
  }
  function updateAllocation(rIdx: number, phaseIdx: number, val: string) {
    const pct = Math.min(100, Math.max(0, parseInt(val) || 0));
    const updated = [...resources];
    updated[rIdx] = {
      ...updated[rIdx],
      allocations: updated[rIdx].allocations.map((a, i) => i === phaseIdx ? { ...a, percent: pct } : a),
    };
    setResources(updated);
  }
  function addResourceRow() {
    setResources([...resources, {
      role: "", workstream: "", type: "Consultant",
      allocations: PHASE_LABELS.map(phase => ({ phase, percent: 0 })),
    }]);
  }
  function removeResourceRow(idx: number) { setResources(resources.filter((_, i) => i !== idx)); }
  function regenerateResources() {
    if (selectedProducts.length === 0) return;
    setResources(generateResourcesFromProducts(selectedProducts.map(p => p.id), capDomains));
  }

  // Per-phase FTE totals
  const phaseTotals = PHASE_LABELS.map((_, pi) =>
    resources.reduce((sum, r) => sum + (r.allocations[pi]?.percent ?? 0), 0) / 100
  );

  const activeTheme = THEME_PALETTES[outputConfig.theme];
  const enabledSlideCount = Object.values(outputConfig.slides).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Config drawer */}
      <ConfigPanel
        open={configOpen}
        config={outputConfig}
        onChange={cfg => {
          setOutputConfig(cfg);
          // If AI slides are disabled, sync includeAI toggle
          if (!cfg.slides.aiApproach && !cfg.slides.aiCSF && !cfg.slides.aiRisks) {
            setIncludeAI(false);
          }
        }}
        onClose={() => setConfigOpen(false)}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="bg-amber-400 text-blue-900 font-black text-xl px-3 py-1 rounded">
            {outputConfig.companyLogoText || "SAP"}
          </div>
          <div className="flex-1">
            <h1 className="text-white font-bold text-xl">Solution Slide Generator</h1>
            <p className="text-blue-300 text-sm">Generate professional SAP implementation architecture decks</p>
          </div>
          {/* Header action bar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Theme chip */}
            <div className="hidden lg:flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeTheme.preview }} />
              <span className="text-white text-xs">{activeTheme.label}</span>
              <span className="text-blue-300 text-xs">·</span>
              <span className="text-blue-200 text-xs">{enabledSlideCount} slides</span>
            </div>

            <button onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <span>⚙</span>
              <span className="hidden sm:inline">Configure</span>
            </button>

            <button
              onClick={handleDownloadSow}
              disabled={downloadingSow || selectedProducts.length === 0}
              title="Download Statement of Work (.docx)"
              className={`flex items-center gap-1.5 border text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                selectedProducts.length === 0
                  ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                  : "bg-green-700/80 hover:bg-green-600 border-green-500/50 text-white"
              }`}>
              <span>{downloadingSow ? "⏳" : "📄"}</span>
              <span className="hidden sm:inline">{downloadingSow ? "Generating…" : "SoW"}</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || fetchingAI || selectedProducts.length === 0}
              title="Download Solution Architecture PPTX"
              className={`flex items-center gap-1.5 border text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                selectedProducts.length === 0
                  ? "bg-white/5 border-white/10 text-white/40 cursor-not-allowed"
                  : "bg-blue-600/80 hover:bg-blue-500 border-blue-400/50 text-white"
              }`}>
              <span>{fetchingAI || generating ? "⏳" : "📊"}</span>
              <span className="hidden sm:inline">{fetchingAI ? "AI…" : generating ? "Generating…" : "PPTX"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 bg-white/5 rounded-2xl p-4 overflow-x-auto gap-1">
          {STEPS.map((s, i) => (
            <button key={s.key} onClick={() => setStep(s.key)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[58px] ${
                step === s.key ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : i < currentIndex ? "text-green-400 hover:bg-white/10"
                : "text-gray-400 hover:bg-white/10"
              }`}>
              <span className="text-base">{i < currentIndex && step !== s.key ? "✅" : s.icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4">
            <h2 className="text-white font-semibold text-lg">{STEPS[currentIndex].icon} {STEPS[currentIndex].label}</h2>
          </div>
          <div className="p-6 space-y-5">

            {/* ── BASICS ── */}
            {step === "basics" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Project Name *</label>
                    <input value={projectName} onChange={e => setProjectName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  {[["Client / Organisation", client, setClient, "ACME Corp"], ["Project Manager", projectManager, setProjectManager, "Jane Smith"],
                    ["Prepared By", preparedBy, setPreparedBy, "Your Name"], ["Version", version, setVersion, "1.0"]].map(([label, val, setter, placeholder]) => (
                    <div key={label as string}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{label as string}</label>
                      <input value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} placeholder={placeholder as string}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  ))}
                </div>

                {/* Client context */}
                <div className="border-t border-gray-100 pt-5">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Client Context
                    <span className="ml-2 text-xs font-normal text-gray-400">— included verbatim as a dedicated slide</span>
                  </label>
                  <textarea
                    value={clientContext}
                    onChange={e => setClientContext(e.target.value)}
                    rows={7}
                    placeholder={`Paste any background information, strategic objectives, pain points, or client-specific context here.\n\nThis text will appear exactly as written on a "Client Context" slide in the output deck. It is also used by the AI auto-generator to tailor scope, RACI, dependencies, and assumptions to your client's situation.\n\nExample:\nACME Corp is a global manufacturing firm with 8,000 employees across 12 countries. They are replacing a legacy ECC 6.0 landscape with S/4HANA Cloud. Key pain points include manual finance close taking 12 days, no real-time inventory visibility, and inability to consolidate group reporting...`}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y leading-relaxed text-gray-700"
                  />
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                    The AI uses this context to generate tailored scope, RACI, dependencies, and assumptions on the next steps.
                  </p>
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {step === "products" && (
              <div>
                <p className="text-sm text-gray-600 mb-3">Search and select SAP products in scope. Resource roles are auto-suggested from your selection on the Resources step.</p>
                <ProductSearch selected={selectedProducts} onChange={prods => { setSelectedProducts(prods); setResources([]); }} />
                {selectedProducts.length === 0 && (
                  <p className="mt-3 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">⚠ Select at least one SAP product to proceed.</p>
                )}
              </div>
            )}

            {/* ── CAPABILITIES ── */}
            {step === "capabilities" && (
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">AMS Architecture Capabilities</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    For each product, select which SAP AMS capabilities are in scope. Capabilities not selected for any product are automatically added to out-of-scope.
                  </p>
                </div>
                <CapabilitiesPicker
                  products={selectedProducts}
                  selected={capsByProduct}
                  onChange={next => { setCapsByProduct(next); setResources([]); }}
                />
              </div>
            )}

            {/* ── SYSTEMS ── */}
            {step === "systems" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">Select deployment environments. These appear in the System Landscape slide and drive transport path labels.</p>
                <div className="grid grid-cols-2 gap-3">
                  {systems.map((sys, i) => (
                    <button key={sys.name} onClick={() => toggleSystem(i)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        sys.enabled ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-gray-50 hover:border-blue-300"
                      }`}>
                      <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center ${sys.enabled ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                        {sys.enabled && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{sys.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sys.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-blue-600 text-xs bg-blue-50 p-2 rounded">Selected: {systems.filter(s => s.enabled).map(s => s.name).join(" → ")}</p>
              </div>
            )}

            {/* ── SCOPE ── */}
            {step === "scope" && (
              <div className="space-y-4">
                <AutoGenBanner
                  ready={selectedProducts.length > 0}
                  loading={autoGenerating}
                  error={autoGenError}
                  onGenerate={handleAutoGenerate}
                  label="Auto-generate scope from selected SAP products"
                />

                {/* In Scope */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <h4 className="text-sm font-bold text-gray-800">In Scope</h4>
                    {selectedCapabilities.size > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                        +{selectedCapabilities.size} AMS capabilities selected
                      </span>
                    )}
                  </div>
                  {scopeItems.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <input value={item} onChange={e => updateListItem(scopeItems, setScopeItems, i, e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                      <button onClick={() => removeListItem(scopeItems, setScopeItems, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    </div>
                  ))}
                  <button onClick={() => addListItem(scopeItems, setScopeItems)} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>Add scope item
                  </button>
                </div>

                {/* Out of Scope — two separate sources */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <h4 className="text-sm font-bold text-gray-800">Out of Scope</h4>
                  </div>

                  {/* Auto-derived: unselected AMS capabilities */}
                  {autoOutOfScope.size > 0 && (
                    <div className="border border-orange-200 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-b border-orange-200">
                        <span className="text-sm">⚠️</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-orange-900">
                            Unselected AMS Capabilities — Review Required
                          </p>
                          <p className="text-xs text-orange-600 mt-0.5">
                            {autoOutOfScope.size} capabilities were not selected on the Capabilities step. They are auto-added as out-of-scope. Go back and select any that should be in scope.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full flex-shrink-0">
                          {autoOutOfScope.size}
                        </span>
                      </div>
                      <div className="px-4 py-2 max-h-36 overflow-y-auto bg-white">
                        {[...autoOutOfScope].slice(0, 30).map((item, i) => (
                          <p key={i} className="text-xs text-orange-700 py-0.5 border-b border-orange-50 last:border-0">
                            <span className="text-orange-300 mr-1.5">•</span>{item}
                          </p>
                        ))}
                        {autoOutOfScope.size > 30 && (
                          <p className="text-xs text-orange-400 italic pt-1">+{autoOutOfScope.size - 30} more…</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* EMEA Architecture Gaps — consciously selected */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600">EMEA Architecture Gaps</span>
                      {outOfScopeGaps.size > 0 && (
                        <span className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                          {outOfScopeGaps.size} selected
                        </span>
                      )}
                    </div>
                    <GapPicker selected={outOfScopeGaps} onChange={setOutOfScopeGaps} />
                  </div>
                </div>
              </div>
            )}

            {/* ── RACI ── */}
            {step === "raci" && (
              <div>
                <AutoGenBanner
                  ready={selectedProducts.length > 0}
                  loading={autoGenerating}
                  error={autoGenError}
                  onGenerate={handleAutoGenerate}
                  label="Auto-generate RACI matrix from selected SAP products"
                />
                <p className="text-sm text-gray-600 mb-3">Use single letters R / A / C / I for clean badge rendering.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        {["Activity", "Responsible", "Accountable", "Consulted", "Informed", ""].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {raciEntries.map((entry, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="px-2 py-1.5">
                            <input value={entry.activity} onChange={e => updateRaciEntry(i, "activity", e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400" />
                          </td>
                          {(["responsible", "accountable", "consulted", "informed"] as const).map(field => (
                            <td key={field} className="px-2 py-1.5">
                              <input value={entry[field]} onChange={e => updateRaciEntry(i, field, e.target.value)} maxLength={12}
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center font-bold focus:ring-1 focus:ring-blue-400" />
                            </td>
                          ))}
                          <td className="px-2">
                            <button onClick={() => setRaciEntries(raciEntries.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setRaciEntries([...raciEntries, { activity: "", responsible: "R", accountable: "A", consulted: "C", informed: "I" }])}
                  className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>Add RACI row
                </button>
              </div>
            )}

            {/* ── DEPENDENCIES ── */}
            {step === "dependencies" && (
              <div className="space-y-3">
                <AutoGenBanner
                  ready={selectedProducts.length > 0}
                  loading={autoGenerating}
                  error={autoGenError}
                  onGenerate={handleAutoGenerate}
                  label="Auto-generate dependencies from selected SAP products"
                />
                <p className="text-sm text-gray-600">List project and technical dependencies.</p>
                {dependencies.map((dep, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <input value={dep} onChange={e => updateListItem(dependencies, setDependencies, i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => removeListItem(dependencies, setDependencies, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <button onClick={() => addListItem(dependencies, setDependencies)} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>Add dependency
                </button>
              </div>
            )}

            {/* ── ASSUMPTIONS ── */}
            {step === "assumptions" && (
              <div className="space-y-3">
                <AutoGenBanner
                  ready={selectedProducts.length > 0}
                  loading={autoGenerating}
                  error={autoGenError}
                  onGenerate={handleAutoGenerate}
                  label="Auto-generate assumptions from selected SAP products"
                />
                <p className="text-sm text-gray-600">List project assumptions.</p>
                {assumptions.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <input value={item} onChange={e => updateListItem(assumptions, setAssumptions, i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => removeListItem(assumptions, setAssumptions, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <button onClick={() => addListItem(assumptions, setAssumptions)} className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>Add assumption
                </button>
              </div>
            )}

            {/* ── RESOURCES ── */}
            {step === "resources" && (
              <div>
                {/* AI generate banner */}
                <div className="mb-4 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-xl flex-shrink-0">✨</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">AI-suggested resource plan from SAP products</p>
                    {resourcesError && <p className="text-xs text-red-600 mt-0.5 truncate">⚠ {resourcesError}</p>}
                    {!resourcesError && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Claude generates FTE roles and phase allocations tailored to {selectedProducts.length > 0 ? selectedProducts.map(p => p.name).join(", ") : "your selected products"}.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={handleAIResources}
                      disabled={fetchingResources || selectedProducts.length === 0}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedProducts.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : fetchingResources ? "bg-amber-200 text-amber-700 cursor-wait"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      {fetchingResources ? (
                        <>
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Generating…
                        </>
                      ) : "⚡ AI Suggest"}
                    </button>
                    <button
                      onClick={regenerateResources}
                      disabled={selectedProducts.length === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ↺ Template
                    </button>
                  </div>
                </div>

                {resources.length === 0 && !fetchingResources && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">📊</p>
                    <p className="text-sm">No resources yet — use AI Suggest or Template to populate.</p>
                  </div>
                )}

                {fetchingResources && (
                  <div className="text-center py-10 text-amber-600">
                    <svg className="animate-spin w-8 h-8 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-sm font-medium">Claude is building your resource plan…</p>
                    <p className="text-xs text-amber-500 mt-1">Analysing {selectedProducts.map(p => p.name).join(", ")}</p>
                  </div>
                )}

                {resources.length > 0 && !fetchingResources && (
                  <>
                    {/* Live heatmap preview */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mb-4">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-blue-900 text-white px-3 py-2 text-left font-semibold w-48 min-w-[12rem]">Role</th>
                            <th className="bg-blue-900 text-white px-2 py-2 text-center font-semibold w-24">Workstream</th>
                            <th className="bg-blue-900 text-white px-2 py-2 text-center font-semibold w-20">Type</th>
                            {PHASE_LABELS.map(p => (
                              <th key={p} className="bg-blue-700 text-white px-2 py-2 text-center font-semibold min-w-[4rem]">{p}</th>
                            ))}
                            <th className="bg-blue-900 w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {resources.map((res, ri) => (
                            <tr key={ri} className="border-b border-gray-100">
                              <td className="px-2 py-1">
                                <input value={res.role} onChange={e => updateResourceField(ri, "role", e.target.value)}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-blue-400" />
                              </td>
                              <td className="px-1 py-1">
                                <input value={res.workstream} onChange={e => updateResourceField(ri, "workstream", e.target.value)}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs text-center focus:ring-1 focus:ring-blue-400" />
                              </td>
                              <td className="px-1 py-1">
                                <select value={res.type} onChange={e => updateResourceField(ri, "type", e.target.value)}
                                  className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs text-center focus:ring-1 focus:ring-blue-400 bg-white">
                                  <option>Consultant</option>
                                  <option>Client</option>
                                  <option>Both</option>
                                </select>
                              </td>
                              {res.allocations.map((alloc, pi) => (
                                <td key={pi} className="px-1 py-1">
                                  <div className="relative">
                                    <input
                                      type="number" min={0} max={100} value={alloc.percent}
                                      onChange={e => updateAllocation(ri, pi, e.target.value)}
                                      className="w-full rounded px-1 py-0.5 text-xs text-center font-bold focus:ring-1 focus:ring-white border-0 outline-none"
                                      style={{ background: heatBg(alloc.percent), color: heatText(alloc.percent) }}
                                    />
                                  </div>
                                </td>
                              ))}
                              <td className="px-1 text-center">
                                <button onClick={() => removeResourceRow(ri)} className="text-red-300 hover:text-red-500 text-base leading-none">×</button>
                              </td>
                            </tr>
                          ))}
                          {/* FTE total row */}
                          <tr className="bg-blue-900">
                            <td colSpan={3} className="px-3 py-1.5 text-xs font-bold text-white">Total FTE (estimated)</td>
                            {phaseTotals.map((fte, i) => (
                              <td key={i} className="px-2 py-1.5 text-center text-xs font-bold"
                                style={{ background: heatBg(Math.min(100, fte * 20)), color: fte > 4 ? "#FFFFFF" : "#E0E8F8" }}>
                                {fte.toFixed(1)}
                              </td>
                            ))}
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium">Allocation %:</span>
                      {[["0%","#F2F2F2","#003D73"], ["1–25%","#D6E8FA","#003D73"], ["26–50%","#90C4F5","#003D73"], ["51–75%","#3D9BE9","#FFFFFF"], ["76–100%","#0070F2","#FFFFFF"]].map(([label, bg, fg]) => (
                        <span key={label} className="px-2 py-0.5 rounded font-semibold" style={{ background: bg, color: fg }}>{label}</span>
                      ))}
                    </div>

                    <button onClick={addResourceRow} className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                      <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>Add resource row
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── AMS ── */}
            {step === "ams" && (
              <div className="space-y-6">
                <p className="text-sm text-gray-600">
                  Enter Application Management Services parameters. These populate a dedicated AMS slide in the output deck.
                </p>

                {/* Volume & Users */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Volume &amp; Users</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["Total Users", "totalUsers", "e.g. 5000"],
                      ["Named / Active Users", "namedUsers", "e.g. 3000"],
                      ["Concurrent Users", "concurrentUsers", "e.g. 500"],
                    ] as const).map(([label, field, placeholder]) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                        <input
                          type="text"
                          value={amsData[field]}
                          onChange={e => setAmsData(d => ({ ...d, [field]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Annual Transaction Volume</label>
                      <select value={amsData.txVolume} onChange={e => setAmsData(d => ({ ...d, txVolume: e.target.value as AMSData["txVolume"] }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                        {(["<1M","1–5M","5–10M","10M+"] as const).map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Support Model */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Support Model</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Support Model</label>
                      <select value={amsData.supportModel} onChange={e => setAmsData(d => ({ ...d, supportModel: e.target.value as AMSData["supportModel"] }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                        {(["Dedicated","Shared Pool","Hybrid","Self-Service"] as const).map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Support Hours</label>
                      <div className="flex gap-2 flex-wrap">
                        {(["8x5","12x5","16x5","24x5","24x7"] as const).map(v => (
                          <button key={v} onClick={() => setAmsData(d => ({ ...d, supportHours: v }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                              amsData.supportHours === v ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-400"
                            }`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Support Languages</label>
                      <input value={amsData.supportLanguages} onChange={e => setAmsData(d => ({ ...d, supportLanguages: e.target.value }))}
                        placeholder="e.g. English, German, Japanese"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Onshore / Offshore Split (%)</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min={0} max={100} value={amsData.onshorePercent}
                          onChange={e => {
                            const v = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setAmsData(d => ({ ...d, onshorePercent: String(v), offshorePercent: String(100 - v) }));
                          }}
                          className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-blue-500" />
                        <span className="text-gray-500 text-sm">Onshore</span>
                        <span className="text-gray-400">/</span>
                        <span className="w-20 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center bg-gray-50 text-gray-600">{amsData.offshorePercent}%</span>
                        <span className="text-gray-500 text-sm">Offshore</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SLA Targets */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">SLA Response Targets</h3>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-blue-800 text-white text-xs">
                          <th className="px-4 py-2 text-left">Priority</th>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-left">Response Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          ["P1", "Critical — System Down", "slaP1", ["15 min","30 min","1 hr","2 hr"], "bg-red-50"],
                          ["P2", "High — Major Impact", "slaP2", ["1 hr","2 hr","4 hr","8 hr"], "bg-orange-50"],
                          ["P3", "Medium — Partial Impact", "slaP3", ["4 hr","8 hr","1 day","2 days"], ""],
                          ["P4", "Low — Minor / Cosmetic", "slaP4", ["1 day","2 days","5 days"], "bg-gray-50"],
                        ] as const).map(([priority, desc, field, options, rowBg]) => (
                          <tr key={priority} className={`border-t border-gray-100 ${rowBg}`}>
                            <td className="px-4 py-2.5">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${
                                priority === "P1" ? "bg-red-500" : priority === "P2" ? "bg-orange-500" : priority === "P3" ? "bg-yellow-500" : "bg-teal-600"
                              }`}>{priority}</span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs">{desc}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1.5 flex-wrap">
                                {options.map(v => (
                                  <button key={v} onClick={() => setAmsData(d => ({ ...d, [field]: v }))}
                                    className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors ${
                                      amsData[field] === v ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 text-gray-600 hover:border-blue-400"
                                    }`}>{v}</button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">System Availability Target</label>
                    <div className="flex gap-2">
                      {(["99%","99.5%","99.9%","99.95%"] as const).map(v => (
                        <button key={v} onClick={() => setAmsData(d => ({ ...d, availability: v }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            amsData.availability === v ? "bg-green-600 border-green-600 text-white" : "border-gray-200 text-gray-600 hover:border-green-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Service Scope */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Service Scope</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Monthly Ticket Volume</label>
                      <div className="flex gap-2 flex-wrap">
                        {(["<100","100–500","500–1k","1k–5k","5k+"] as const).map(v => (
                          <button key={v} onClick={() => setAmsData(d => ({ ...d, monthlyTickets: v }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                              amsData.monthlyTickets === v ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-400"
                            }`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Monthly Change Requests (est.)</label>
                      <input value={amsData.monthlyChanges} onChange={e => setAmsData(d => ({ ...d, monthlyChanges: e.target.value }))}
                        placeholder="e.g. 20" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Hypercare Duration (weeks)</label>
                      <div className="flex gap-2">
                        {["4","8","12","16"].map(v => (
                          <button key={v} onClick={() => setAmsData(d => ({ ...d, hypercareDuration: v }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                              amsData.hypercareDuration === v ? "bg-teal-600 border-teal-600 text-white" : "border-gray-200 text-gray-600 hover:border-teal-400"
                            }`}>{v}w</button>
                        ))}
                        <input type="number" value={amsData.hypercareDuration}
                          onChange={e => setAmsData(d => ({ ...d, hypercareDuration: e.target.value }))}
                          placeholder="custom" className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-center focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Training Hours Planned</label>
                      <input value={amsData.trainingHours} onChange={e => setAmsData(d => ({ ...d, trainingHours: e.target.value }))}
                        placeholder="e.g. 200" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">AMS Contract Duration</label>
                      <div className="flex gap-2 flex-wrap">
                        {(["6 months","12 months","24 months","36 months"] as const).map(v => (
                          <button key={v} onClick={() => setAmsData(d => ({ ...d, contractDuration: v }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                              amsData.contractDuration === v ? "bg-purple-600 border-purple-600 text-white" : "border-gray-200 text-gray-600 hover:border-purple-400"
                            }`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Dedicated Support Contacts</label>
                      <input value={amsData.dedicatedContacts} onChange={e => setAmsData(d => ({ ...d, dedicatedContacts: e.target.value }))}
                        placeholder="e.g. 3" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Escalation & Governance */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Escalation &amp; Governance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Escalation Path</label>
                      <input value={amsData.escalationPath} onChange={e => setAmsData(d => ({ ...d, escalationPath: e.target.value }))}
                        placeholder="e.g. L1 → L2 → L3 → SAP Support"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Service Review Frequency</label>
                      <div className="flex gap-2 flex-wrap">
                        {(["Weekly","Bi-weekly","Monthly","Quarterly"] as const).map(v => (
                          <button key={v} onClick={() => setAmsData(d => ({ ...d, reviewFrequency: v }))}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                              amsData.reviewFrequency === v ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 text-gray-600 hover:border-indigo-400"
                            }`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Exclusions</label>
                      <input value={amsData.exclusions} onChange={e => setAmsData(d => ({ ...d, exclusions: e.target.value }))}
                        placeholder="What is not covered under AMS"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Notes</label>
                      <textarea value={amsData.additionalNotes} onChange={e => setAmsData(d => ({ ...d, additionalNotes: e.target.value }))}
                        rows={2} placeholder="Any other service parameters or special conditions"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                </div>

                {/* Live summary card */}
                <div className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl border border-blue-200 p-4">
                  <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">AMS Slide Preview</h4>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {[
                      ["Users", amsData.totalUsers || "—"],
                      ["Support", amsData.supportHours],
                      ["Model", amsData.supportModel],
                      ["Availability", amsData.availability],
                      ["P1 SLA", amsData.slaP1],
                      ["Tickets/mo", amsData.monthlyTickets],
                      ["Contract", amsData.contractDuration],
                      ["Hypercare", amsData.hypercareDuration ? `${amsData.hypercareDuration}w` : "—"],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-white rounded-lg px-3 py-1.5 border border-blue-100 text-center min-w-[80px]">
                        <div className="text-gray-400 text-[10px]">{k}</div>
                        <div className="font-bold text-blue-900">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SERVICE CATALOG ── */}
            {step === "catalog" && (
              <div className="space-y-4">
                {/* Fetch panel */}
                <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📂</span>
                        <h3 className="font-bold text-teal-900 text-sm">AI-Generated AMS Service Catalog</h3>
                        <span className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full font-semibold">Claude</span>
                      </div>
                      <p className="text-xs text-teal-700">
                        Generates a service catalog tailored to your SAP products. Edit any field inline after generation.
                      </p>
                      {catalogError && <p className="text-xs text-red-600 mt-1">⚠ {catalogError}</p>}
                    </div>
                    <button onClick={handleFetchCatalog} disabled={fetchingCatalog || selectedProducts.length === 0}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                        selectedProducts.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : fetchingCatalog ? "bg-teal-200 text-teal-700 cursor-wait"
                        : "bg-teal-600 hover:bg-teal-700 text-white"
                      }`}>
                      {fetchingCatalog ? (
                        <>
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Generating…
                        </>
                      ) : serviceCatalog.length > 0 ? "↺ Regenerate" : "⚡ Generate Catalog"}
                    </button>
                  </div>
                </div>

                {serviceCatalog.length === 0 && !fetchingCatalog && (
                  <div className="text-center py-10 text-gray-400">
                    <p className="text-4xl mb-2">📂</p>
                    <p className="text-sm">Click "Generate Catalog" to build a product-specific AMS service catalog using AI.</p>
                  </div>
                )}

                {serviceCatalog.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500">{serviceCatalog.filter(e => e.included).length} / {serviceCatalog.length} services enabled — toggle to include/exclude from output</p>
                      <div className="flex gap-2">
                        <button onClick={() => setServiceCatalog(c => c.map(e => ({ ...e, included: true })))}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium">Enable all</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => setServiceCatalog(c => c.map(e => ({ ...e, included: false })))}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium">Disable all</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-teal-800 text-white px-2 py-2 w-8 text-center">✓</th>
                            <th className="bg-teal-800 text-white px-2 py-2 text-left min-w-[140px]">Category</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-left min-w-[200px]">Service Name</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-left min-w-[200px]">Description</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-center w-24">Tier</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-center w-28">SLA Target</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-center w-24">Frequency</th>
                            <th className="bg-teal-700 text-white px-2 py-2 text-left min-w-[160px]">Deliverable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceCatalog.map((entry, idx) => (
                            <tr key={entry.id} className={`border-b border-gray-100 ${!entry.included ? "opacity-40" : ""} ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                              <td className="px-2 py-1.5 text-center">
                                <input type="checkbox" checked={entry.included}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, included: e.target.checked } : x))}
                                  className="w-3.5 h-3.5 accent-teal-600" />
                              </td>
                              <td className="px-2 py-1.5">
                                <select value={entry.category}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, category: e.target.value as ServiceCategory } : x))}
                                  className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-teal-400">
                                  {["Incident Management","Change Management","Problem Management","Release Management","Monitoring & Alerting","Performance Management","Security & Compliance","User Administration","Data Management","Reporting & Analytics","Integration Support","Training & Knowledge Transfer","Continuous Improvement"].map(c => <option key={c}>{c}</option>)}
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={entry.serviceName}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, serviceName: e.target.value } : x))}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={entry.description}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <select value={entry.tier}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, tier: e.target.value as ServiceTier } : x))}
                                  className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs bg-white focus:ring-1 focus:ring-teal-400">
                                  <option>Standard</option><option>Enhanced</option><option>Premium</option>
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={entry.slaTarget}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, slaTarget: e.target.value } : x))}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={entry.frequency}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, frequency: e.target.value } : x))}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-400" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input value={entry.deliverable}
                                  onChange={e => setServiceCatalog(c => c.map((x, i) => i === idx ? { ...x, deliverable: e.target.value } : x))}
                                  className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-teal-400" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button onClick={() => setServiceCatalog(c => [...c, {
                      id: `svc-custom-${Date.now()}`, category: "Incident Management",
                      serviceName: "", description: "", included: true, tier: "Standard",
                      slaTarget: "", deliverable: "", frequency: "On-demand",
                    }])}
                      className="flex items-center gap-2 text-teal-600 text-sm font-medium hover:text-teal-800">
                      <span className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">+</span>Add service row
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── COMMERCIAL SHAPE ── */}
            {step === "commercial" && (
              <div className="space-y-5">
                <p className="text-sm text-gray-600">Enter commercial terms for the engagement. These populate a dedicated Commercial Shape slide and the SoW Word document.</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Engagement Model */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Engagement Model</label>
                    <div className="flex gap-2 flex-wrap">
                      {["Fixed Price","Time & Materials","Capped T&M","Outcome-based"].map(v => (
                        <button key={v} onClick={() => setCommercialShape(c => ({ ...c, engagementModel: v }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            commercialShape.engagementModel === v ? "bg-blue-700 border-blue-700 text-white" : "border-gray-200 text-gray-600 hover:border-blue-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Currency</label>
                    <div className="flex gap-2 flex-wrap">
                      {["USD","EUR","GBP","AED","SGD","INR"].map(v => (
                        <button key={v} onClick={() => setCommercialShape(c => ({ ...c, currency: v }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            commercialShape.currency === v ? "bg-green-700 border-green-700 text-white" : "border-gray-200 text-gray-600 hover:border-green-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Total Contract Value */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Total Contract Value</label>
                    <input value={commercialShape.totalValue}
                      onChange={e => setCommercialShape(c => ({ ...c, totalValue: e.target.value }))}
                      placeholder={`e.g. ${commercialShape.currency} 1,200,000`}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Payment Terms */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Terms</label>
                    <div className="flex gap-2 flex-wrap">
                      {["Net 15","Net 30","Net 45","Net 60"].map(v => (
                        <button key={v} onClick={() => setCommercialShape(c => ({ ...c, paymentTerms: v }))}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            commercialShape.paymentTerms === v ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Schedule */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Schedule</label>
                    <input value={commercialShape.paymentSchedule}
                      onChange={e => setCommercialShape(c => ({ ...c, paymentSchedule: e.target.value }))}
                      placeholder="e.g. 30% mobilisation, 40% delivery, 30% go-live"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Expense Policy */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Expense Policy</label>
                    <input value={commercialShape.expensePolicy}
                      onChange={e => setCommercialShape(c => ({ ...c, expensePolicy: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Warranty Period */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Warranty Period</label>
                    <div className="flex gap-2 flex-wrap">
                      {["30 days","60 days","90 days","None"].map(v => (
                        <button key={v} onClick={() => setCommercialShape(c => ({ ...c, warrantyPeriod: v }))}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            commercialShape.warrantyPeriod === v ? "bg-purple-600 border-purple-600 text-white" : "border-gray-200 text-gray-600 hover:border-purple-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Notice Period */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Notice Period</label>
                    <div className="flex gap-2 flex-wrap">
                      {["14 days","30 days","60 days","90 days"].map(v => (
                        <button key={v} onClick={() => setCommercialShape(c => ({ ...c, noticeperiod: v }))}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                            commercialShape.noticeperiod === v ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 text-gray-600 hover:border-indigo-400"
                          }`}>{v}</button>
                      ))}
                    </div>
                  </div>

                  {/* Governing Law */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Governing Law</label>
                    <input value={commercialShape.governingLaw}
                      onChange={e => setCommercialShape(c => ({ ...c, governingLaw: e.target.value }))}
                      placeholder="e.g. Laws of England & Wales"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Penalty Clauses */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Penalty / Liquidated Damages</label>
                    <input value={commercialShape.penaltyClauses}
                      onChange={e => setCommercialShape(c => ({ ...c, penaltyClauses: e.target.value }))}
                      placeholder="e.g. 0.5% per day of delay, capped at 5%"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Additional Terms */}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Commercial Terms</label>
                    <textarea value={commercialShape.additionalTerms}
                      onChange={e => setCommercialShape(c => ({ ...c, additionalTerms: e.target.value }))}
                      rows={3} placeholder="Any other commercial clauses, exclusions, or special conditions"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>

                {/* Summary card */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">Commercial Summary</h4>
                  <div className="flex flex-wrap gap-3 text-xs">
                    {[
                      ["Model", commercialShape.engagementModel],
                      ["Currency", commercialShape.currency],
                      ["Value", commercialShape.totalValue || "TBD"],
                      ["Terms", commercialShape.paymentTerms],
                      ["Warranty", commercialShape.warrantyPeriod],
                      ["Notice", commercialShape.noticeperiod],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-white rounded-lg px-3 py-1.5 border border-green-100 text-center min-w-[90px]">
                        <div className="text-gray-400 text-[10px]">{k}</div>
                        <div className="font-bold text-green-900 text-xs">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── REVIEW & GENERATE ── */}
            {step === "review" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="font-bold text-blue-900 mb-2">📁 Project</h3>
                    <p><span className="text-gray-500">Name:</span> <span className="font-medium">{projectName}</span></p>
                    <p><span className="text-gray-500">Client:</span> <span className="font-medium">{client || "—"}</span></p>
                    <p><span className="text-gray-500">PM:</span> <span className="font-medium">{projectManager || "—"}</span></p>
                    <p><span className="text-gray-500">Version:</span> <span className="font-medium">v{version}</span></p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <h3 className="font-bold text-green-900 mb-2">🔧 Products ({selectedProducts.length})</h3>
                    {selectedProducts.length === 0
                      ? <p className="text-amber-600 text-xs">⚠ No products selected</p>
                      : selectedProducts.map(p => <p key={p.id} className="text-xs text-gray-700">• {p.name}</p>)
                    }
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <h3 className="font-bold text-purple-900 mb-2">🖥️ Systems</h3>
                    {systems.filter(s => s.enabled).map(s => <p key={s.name} className="text-xs text-gray-700">• {s.name}</p>)}
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <h3 className="font-bold text-orange-900 mb-2">📊 Slides to generate</h3>
                    {["Title & Overview", "SAP Products", "System Landscape", "Project Scope", "RACI Matrix", "Dependencies", "Assumptions", `Resource Loading (${resources.length} roles)`, "Timeline"].map(s => (
                      <p key={s} className="text-xs text-gray-700">✓ {s}</p>
                    ))}
                    {includeAI && (
                      <>
                        <p className="text-xs text-amber-700 mt-1">✦ Implementation Approach (AI)</p>
                        <p className="text-xs text-amber-700">✦ Critical Success Factors (AI)</p>
                        <p className="text-xs text-amber-700">✦ Risk Register (AI)</p>
                      </>
                    )}
                  </div>
                </div>

                {resources.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-2 text-sm">📊 Resource Loading Preview</h3>
                    <div className="overflow-x-auto">
                      <table className="text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="bg-blue-800 text-white px-2 py-1 text-left rounded-tl">Role</th>
                            {PHASE_LABELS.map(p => <th key={p} className="bg-blue-700 text-white px-3 py-1 text-center">{p}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {resources.slice(0, 8).map((res, ri) => (
                            <tr key={ri}>
                              <td className="px-2 py-1 text-gray-700 bg-gray-50 border border-gray-100 font-medium whitespace-nowrap">{res.role || "—"}</td>
                              {res.allocations.map((alloc, pi) => (
                                <td key={pi} className="px-3 py-1 text-center font-bold border border-white"
                                  style={{ background: heatBg(alloc.percent), color: heatText(alloc.percent) }}>
                                  {alloc.percent > 0 ? `${alloc.percent}%` : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {resources.length > 8 && (
                            <tr><td colSpan={PHASE_LABELS.length + 1} className="px-2 py-1 text-gray-400 italic text-center">…and {resources.length - 8} more rows</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* AI Best Practices Panel */}
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">✨</span>
                        <h3 className="font-bold text-amber-900 text-sm">AI-Generated Best Practice Slides</h3>
                        <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-semibold">Powered by Claude</span>
                      </div>
                      <p className="text-xs text-amber-700">
                        Adds 3 slides with SAP Activate–aligned implementation guidance, critical success factors, and a risk register — tailored to your selected products.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const next = !includeAI;
                        setIncludeAI(next);
                        setBestPractices(null);
                        setAiError(null);
                        setOutputConfig(c => ({
                          ...c,
                          slides: { ...c.slides, aiApproach: next, aiCSF: next, aiRisks: next },
                        }));
                      }}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                        includeAI ? "bg-amber-500 border-amber-500 text-white" : "bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                      }`}>
                      {includeAI ? "✓ Enabled" : "Disabled"}
                    </button>
                  </div>

                  {includeAI && (
                    <div className="mt-3 flex items-center gap-3">
                      {!bestPractices && !fetchingAI && (
                        <button onClick={fetchAIContent} disabled={selectedProducts.length === 0}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50">
                          ⚡ Pre-fetch AI content now
                        </button>
                      )}
                      {fetchingAI && (
                        <div className="flex items-center gap-2 text-amber-700 text-xs">
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span>Fetching AI content from Claude (this may take 15–30s)…</span>
                        </div>
                      )}
                      {bestPractices && !fetchingAI && (
                        <div className="flex items-center gap-2 text-green-700 text-xs">
                          <span className="text-green-500 text-base">✅</span>
                          <span className="font-medium">AI content ready — {bestPractices.criticalSuccessFactors.length} CSFs, {bestPractices.riskRegister.length} risks</span>
                          <button onClick={() => { setBestPractices(null); setAiError(null); fetchAIContent(); }}
                            className="ml-2 text-amber-600 hover:text-amber-800 underline">Refresh</button>
                        </div>
                      )}
                      {aiError && !fetchingAI && (
                        <div className="text-red-600 text-xs">
                          ⚠ AI error: {aiError}. Slides will be skipped.
                          <button onClick={fetchAIContent} className="ml-2 underline">Retry</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedProducts.length === 0 && (
                  <p className="text-center text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">⚠ Please select at least one SAP product first.</p>
                )}

                {/* Download buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleGenerate} disabled={generating || fetchingAI || selectedProducts.length === 0}
                    className={`py-4 rounded-xl font-bold text-base transition-all shadow-lg flex flex-col items-center gap-1 ${
                      generating || fetchingAI || selectedProducts.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white shadow-blue-600/30"
                    }`}>
                    <span className="text-2xl">{fetchingAI ? "✨" : generating ? "⏳" : "📊"}</span>
                    <span>{fetchingAI ? "Fetching AI content…" : generating ? "Generating…" : "Download Solution PPTX"}</span>
                    <span className="text-xs font-normal opacity-75">PowerPoint deck with all slides</span>
                  </button>

                  <button onClick={handleDownloadSow} disabled={downloadingSow || selectedProducts.length === 0}
                    className={`py-4 rounded-xl font-bold text-base transition-all shadow-lg flex flex-col items-center gap-1 ${
                      downloadingSow || selectedProducts.length === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white shadow-green-600/30"
                    }`}>
                    <span className="text-2xl">{downloadingSow ? "⏳" : "📄"}</span>
                    <span>{downloadingSow ? "Generating…" : "Download SoW Word Doc"}</span>
                    <span className="text-xs font-normal opacity-75">Statement of Work (.docx)</span>
                  </button>
                </div>

                {(generated || generatedSow) && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-green-800 font-semibold text-center mb-1">✅ Download complete!</p>
                    <div className="flex justify-center gap-6 text-xs text-green-700">
                      {generated    && <span>✓ Solution PPTX</span>}
                      {generatedSow && <span>✓ Statement of Work (.docx)</span>}
                    </div>
                    <p className="text-green-600 text-xs text-center mt-1">Check your browser's download folder.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <button onClick={() => setStep(STEPS[Math.max(0, currentIndex - 1)].key)} disabled={currentIndex === 0}
              className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              ← Back
            </button>
            <span className="text-xs text-gray-400 self-center">Step {currentIndex + 1} of {STEPS.length}</span>
            <button onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, currentIndex + 1)].key)} disabled={currentIndex === STEPS.length - 1}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
