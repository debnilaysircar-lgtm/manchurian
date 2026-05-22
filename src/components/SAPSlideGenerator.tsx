import { useState } from "react";
import ProductSearch from "./ProductSearch";
import type { SAPProduct } from "../data/sapProducts";
import type { FormData, RACIEntry, SystemEnvironment } from "../utils/generatePptx";
import { generatePptx } from "../utils/generatePptx";

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

type Step = "basics" | "products" | "systems" | "scope" | "raci" | "dependencies" | "assumptions" | "review";
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: "basics", label: "Project Info", icon: "📁" },
  { key: "products", label: "SAP Products", icon: "🔧" },
  { key: "systems", label: "Systems", icon: "🖥️" },
  { key: "scope", label: "Scope", icon: "📋" },
  { key: "raci", label: "RACI", icon: "👥" },
  { key: "dependencies", label: "Dependencies", icon: "🔗" },
  { key: "assumptions", label: "Assumptions", icon: "💡" },
  { key: "review", label: "Generate", icon: "⬇️" },
];

export default function SAPSlideGenerator() {
  const [step, setStep] = useState<Step>("basics");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

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

  const currentIndex = STEPS.findIndex(s => s.key === step);

  function buildFormData(): FormData {
    return {
      projectName,
      client,
      projectManager,
      preparedBy,
      version,
      selectedProducts,
      systems,
      scopeItems,
      raciEntries,
      dependencies,
      assumptions,
    };
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerated(false);
    try {
      await generatePptx(buildFormData());
      setGenerated(true);
    } catch (err) {
      console.error(err);
      alert("Error generating PPTX. Please check the console.");
    } finally {
      setGenerating(false);
    }
  }

  function updateListItem(list: string[], setList: (v: string[]) => void, idx: number, val: string) {
    const updated = [...list];
    updated[idx] = val;
    setList(updated);
  }

  function addListItem(list: string[], setList: (v: string[]) => void) {
    setList([...list, ""]);
  }

  function removeListItem(list: string[], setList: (v: string[]) => void, idx: number) {
    setList(list.filter((_, i) => i !== idx));
  }

  function updateRaciEntry(idx: number, field: keyof RACIEntry, val: string) {
    const updated = [...raciEntries];
    updated[idx] = { ...updated[idx], [field]: val };
    setRaciEntries(updated);
  }

  function toggleSystem(idx: number) {
    const updated = [...systems];
    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
    setSystems(updated);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="bg-amber-400 text-blue-900 font-black text-xl px-3 py-1 rounded">SAP</div>
          <div>
            <h1 className="text-white font-bold text-xl">Solution Slide Generator</h1>
            <p className="text-blue-300 text-sm">Generate professional SAP implementation architecture decks</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8 bg-white/5 rounded-2xl p-4 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-[60px] ${
                step === s.key
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : i < currentIndex
                  ? "text-green-400 hover:bg-white/10"
                  : "text-gray-400 hover:bg-white/10"
              }`}
            >
              <span className="text-lg">{i < currentIndex && step !== s.key ? "✅" : s.icon}</span>
              <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4">
            <h2 className="text-white font-semibold text-lg">
              {STEPS[currentIndex].icon} {STEPS[currentIndex].label}
            </h2>
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Client / Organisation</label>
                  <input value={client} onChange={e => setClient(e.target.value)} placeholder="ACME Corp"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Project Manager</label>
                  <input value={projectManager} onChange={e => setProjectManager(e.target.value)} placeholder="Jane Smith"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Prepared By</label>
                  <input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Your Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Version</label>
                  <input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
            )}

            {/* ── PRODUCTS ── */}
            {step === "products" && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Search and select SAP products that are in scope for this implementation. Results include all major SAP product lines.
                </p>
                <ProductSearch selected={selectedProducts} onChange={setSelectedProducts} />
                {selectedProducts.length === 0 && (
                  <p className="mt-3 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
                    ⚠ Select at least one SAP product to proceed.
                  </p>
                )}
              </div>
            )}

            {/* ── SYSTEMS ── */}
            {step === "systems" && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Select the system environments for this project. The landscape slide will show selected systems in order.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {systems.map((sys, i) => (
                    <button
                      key={sys.name}
                      onClick={() => toggleSystem(i)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                        sys.enabled
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-gray-50 hover:border-blue-300"
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                        sys.enabled ? "bg-blue-600 border-blue-600" : "border-gray-300"
                      }`}>
                        {sys.enabled && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{sys.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{sys.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-blue-600 text-xs bg-blue-50 p-2 rounded">
                  Selected: {systems.filter(s => s.enabled).map(s => s.name).join(" → ")}
                </p>
              </div>
            )}

            {/* ── SCOPE ── */}
            {step === "scope" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Define in-scope deliverables. Each item will appear as a numbered scope item on the Scope slide.</p>
                {scopeItems.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <input
                      value={item}
                      onChange={e => updateListItem(scopeItems, setScopeItems, i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => removeListItem(scopeItems, setScopeItems, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <button onClick={() => addListItem(scopeItems, setScopeItems)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>
                  Add scope item
                </button>
              </div>
            )}

            {/* ── RACI ── */}
            {step === "raci" && (
              <div>
                <p className="text-sm text-gray-600 mb-3">Define RACI entries. Use single letters R/A/C/I for clean badge rendering on the slide.</p>
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
                              <input value={entry[field]} onChange={e => updateRaciEntry(i, field, e.target.value)}
                                maxLength={12}
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs text-center font-bold focus:ring-1 focus:ring-blue-400" />
                            </td>
                          ))}
                          <td className="px-2">
                            <button onClick={() => setRaciEntries(raciEntries.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={() => setRaciEntries([...raciEntries, { activity: "", responsible: "R", accountable: "A", consulted: "C", informed: "I" }])}
                  className="mt-3 flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>
                  Add RACI row
                </button>
              </div>
            )}

            {/* ── DEPENDENCIES ── */}
            {step === "dependencies" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">List project and technical dependencies. Each will be shown as a numbered card on the Dependencies slide.</p>
                {dependencies.map((dep, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <input value={dep} onChange={e => updateListItem(dependencies, setDependencies, i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => removeListItem(dependencies, setDependencies, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <button onClick={() => addListItem(dependencies, setDependencies)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>
                  Add dependency
                </button>
              </div>
            )}

            {/* ── ASSUMPTIONS ── */}
            {step === "assumptions" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">List project assumptions. Each will appear as a numbered item on the Assumptions slide.</p>
                {assumptions.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <input value={item} onChange={e => updateListItem(assumptions, setAssumptions, i, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => removeListItem(assumptions, setAssumptions, i)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                  </div>
                ))}
                <button onClick={() => addListItem(assumptions, setAssumptions)}
                  className="flex items-center gap-2 text-blue-600 text-sm font-medium hover:text-blue-800">
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">+</span>
                  Add assumption
                </button>
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
                    <h3 className="font-bold text-green-900 mb-2">🔧 Products</h3>
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
                    {["Title & Overview", "SAP Products", "System Landscape", "Project Scope", "RACI Matrix", "Dependencies", "Assumptions", "Timeline"].map(s => (
                      <p key={s} className="text-xs text-gray-700">✓ {s}</p>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || selectedProducts.length === 0}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg ${
                    generating || selectedProducts.length === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white shadow-blue-600/30 hover:shadow-blue-600/50"
                  }`}
                >
                  {generating ? "⏳ Generating PPTX..." : "⬇️ Generate & Download PPTX"}
                </button>

                {selectedProducts.length === 0 && (
                  <p className="text-center text-amber-600 text-sm">Please go back and select at least one SAP product.</p>
                )}

                {generated && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <p className="text-green-800 font-semibold text-lg">✅ PPTX Generated Successfully!</p>
                    <p className="text-green-600 text-sm mt-1">Your solution deck has been downloaded. Check your browser's download folder.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setStep(STEPS[Math.max(0, currentIndex - 1)].key)}
              disabled={currentIndex === 0}
              className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Back
            </button>
            <span className="text-xs text-gray-400 self-center">Step {currentIndex + 1} of {STEPS.length}</span>
            <button
              onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, currentIndex + 1)].key)}
              disabled={currentIndex === STEPS.length - 1}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
