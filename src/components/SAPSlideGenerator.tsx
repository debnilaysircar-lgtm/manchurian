import { useState, useEffect } from "react";
import ProductSearch from "./ProductSearch";
import ConfigPanel from "./ConfigPanel";
import type { SAPProduct } from "../data/sapProducts";
import type { RACIEntry, SystemEnvironment, ResourceEntry } from "../utils/generatePptx";
import { generatePptx } from "../utils/generatePptx";
import { generateResourcesFromProducts, PHASE_LABELS } from "../data/resourceMapping";
import { fetchBestPractices } from "../utils/fetchBestPractices";
import type { BestPracticesResponse } from "../utils/fetchBestPractices";
import type { OutputConfig } from "../types/outputConfig";
import { DEFAULT_CONFIG, THEME_PALETTES } from "../types/outputConfig";

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

type Step = "basics" | "products" | "systems" | "scope" | "raci" | "dependencies" | "assumptions" | "resources" | "review";
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "basics",       label: "Project Info",  icon: "📁" },
  { key: "products",     label: "SAP Products",  icon: "🔧" },
  { key: "systems",      label: "Systems",        icon: "🖥️" },
  { key: "scope",        label: "Scope",          icon: "📋" },
  { key: "raci",         label: "RACI",           icon: "👥" },
  { key: "dependencies", label: "Dependencies",   icon: "🔗" },
  { key: "assumptions",  label: "Assumptions",    icon: "💡" },
  { key: "resources",    label: "Resources",      icon: "📊" },
  { key: "review",       label: "Generate",       icon: "⬇️" },
];

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

  // Auto-generate resources when entering the resources step
  useEffect(() => {
    if (step === "resources" && resources.length === 0 && selectedProducts.length > 0) {
      setResources(generateResourcesFromProducts(selectedProducts.map(p => p.id)));
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
      const formData = { projectName, client, projectManager, preparedBy, version, selectedProducts, systems, scopeItems, raciEntries, dependencies, assumptions, resources, bestPractices: bp ?? undefined, outputConfig };
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
    setResources(generateResourcesFromProducts(selectedProducts.map(p => p.id)));
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
          {/* Config indicator + button */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: activeTheme.preview }}
              />
              <span className="text-white text-xs font-medium">{activeTheme.label}</span>
              <span className="text-blue-300 text-xs">·</span>
              <span className="text-blue-200 text-xs">{enabledSlideCount} slides</span>
            </div>
            <button
              onClick={() => setConfigOpen(true)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <span>⚙</span>
              <span>Configure</span>
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
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Define in-scope deliverables.</p>
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
            )}

            {/* ── RACI ── */}
            {step === "raci" && (
              <div>
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
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-600">
                    Roles are auto-suggested from your selected SAP products. Edit allocations (0–100%) per phase — the slide renders a colour-coded heatmap.
                  </p>
                  <button onClick={regenerateResources}
                    className="ml-4 flex-shrink-0 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    ↺ Re-generate from products
                  </button>
                </div>

                {resources.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">📊</p>
                    <p className="text-sm">No resources yet.</p>
                    <button onClick={regenerateResources} className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                      Auto-generate from selected products
                    </button>
                  </div>
                )}

                {resources.length > 0 && (
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

                <button onClick={handleGenerate} disabled={generating || fetchingAI || selectedProducts.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                    generating || fetchingAI || selectedProducts.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white shadow-blue-600/30"
                  }`}>
                  {fetchingAI ? "✨ Fetching AI content…" : generating ? "⏳ Generating PPTX..." : "⬇️ Generate & Download PPTX"}
                </button>

                {selectedProducts.length === 0 && (
                  <p className="text-center text-amber-600 text-sm">Please select at least one SAP product first.</p>
                )}
                {generated && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-800 font-semibold text-lg">✅ PPTX Generated Successfully!</p>
                    <p className="text-green-600 text-sm mt-1">Check your browser's download folder.</p>
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
