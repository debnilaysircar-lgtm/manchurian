import type {
  OutputConfig,
  ColorTheme,
  OutputFont,
  ContentDensity,
  AITone,
  ConfidentialityLabel,
} from "../types/outputConfig";
import { THEME_PALETTES, DENSITY_SETTINGS } from "../types/outputConfig";

interface Props {
  open: boolean;
  config: OutputConfig;
  onChange: (c: OutputConfig) => void;
  onClose: () => void;
}

const FONTS: OutputFont[] = ["Calibri", "Arial", "Tahoma", "Georgia"];
const CONFIDENTIALITY_OPTIONS: ConfidentialityLabel[] = [
  "CONFIDENTIAL",
  "INTERNAL USE ONLY",
  "DRAFT",
  "CLIENT FACING",
  "",
];
const AI_TONES: { key: AITone; label: string; desc: string }[] = [
  { key: "strategic", label: "Strategic", desc: "Executive-level, outcome-focused language" },
  { key: "technical", label: "Technical", desc: "Detailed, implementation-specific guidance" },
  { key: "concise",   label: "Concise",   desc: "Brief bullet-points, minimal elaboration" },
];

const SLIDE_LABELS: { key: keyof OutputConfig["slides"]; label: string; group: string }[] = [
  { key: "title",        label: "Title & Cover",           group: "Core" },
  { key: "products",     label: "SAP Products",            group: "Core" },
  { key: "landscape",    label: "System Landscape",        group: "Core" },
  { key: "scope",        label: "Project Scope",           group: "Core" },
  { key: "raci",         label: "RACI Matrix",             group: "Core" },
  { key: "dependencies", label: "Dependencies",            group: "Core" },
  { key: "assumptions",  label: "Assumptions",             group: "Core" },
  { key: "resources",    label: "Resource Loading",        group: "Core" },
  { key: "timeline",     label: "Timeline",                group: "Core" },
  { key: "aiApproach",   label: "Implementation Approach", group: "AI" },
  { key: "aiCSF",        label: "Critical Success Factors","group": "AI" },
  { key: "aiRisks",      label: "Risk Register",           group: "AI" },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? "bg-blue-600" : "bg-gray-300"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-4" : "translate-x-1"
      }`} />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</h3>
      {children}
    </div>
  );
}

export default function ConfigPanel({ open, config, onChange, onClose }: Props) {
  function set<K extends keyof OutputConfig>(key: K, val: OutputConfig[K]) {
    onChange({ ...config, [key]: val });
  }
  function setSlide(key: keyof OutputConfig["slides"], val: boolean) {
    onChange({ ...config, slides: { ...config.slides, [key]: val } });
  }
  function toggleAllSlides(group: string, val: boolean) {
    const updated = { ...config.slides };
    SLIDE_LABELS.filter(s => s.group === group).forEach(s => { updated[s.key] = val; });
    onChange({ ...config, slides: updated });
  }

  const coreEnabled   = SLIDE_LABELS.filter(s => s.group === "Core").every(s => config.slides[s.key]);
  const aiEnabled     = SLIDE_LABELS.filter(s => s.group === "AI").every(s => config.slides[s.key]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-[420px] max-w-full z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-900 to-blue-700">
          <div>
            <h2 className="text-white font-bold text-base">Output Configuration</h2>
            <p className="text-blue-200 text-xs mt-0.5">Customise slides, theme & AI behaviour</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white text-2xl leading-none transition-colors" aria-label="Close">×</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* ── COLOR THEME ── */}
          <Section title="Color Theme">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEME_PALETTES) as ColorTheme[]).map(theme => {
                const p = THEME_PALETTES[theme];
                const active = config.theme === theme;
                return (
                  <button
                    key={theme}
                    onClick={() => set("theme", theme)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border-2 text-left transition-all ${
                      active ? "border-blue-600 shadow-md shadow-blue-100" : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span
                      className="w-8 h-8 rounded-lg flex-shrink-0 shadow-sm"
                      style={{ background: p.preview }}
                    />
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{p.label}</div>
                      {active && <div className="text-xs text-blue-600 font-medium">Active</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── FONT ── */}
          <Section title="Font Family">
            <div className="grid grid-cols-2 gap-2">
              {FONTS.map(font => (
                <button
                  key={font}
                  onClick={() => set("font", font)}
                  className={`py-2.5 px-3 rounded-lg border-2 text-sm transition-all ${
                    config.font === font
                      ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold"
                      : "border-gray-200 text-gray-700 hover:border-blue-300"
                  }`}
                  style={{ fontFamily: font }}
                >
                  {font}
                </button>
              ))}
            </div>
          </Section>

          {/* ── CONTENT DENSITY ── */}
          <Section title="Content Density">
            <div className="space-y-2">
              {(["compact", "standard", "expanded"] as ContentDensity[]).map(d => {
                const ds = DENSITY_SETTINGS[d];
                const active = config.density === d;
                return (
                  <button
                    key={d}
                    onClick={() => set("density", d)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      active ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    <span className="text-xl leading-none">
                      {d === "compact" ? "▣" : d === "standard" ? "▦" : "▩"}
                    </span>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${active ? "text-blue-800" : "text-gray-800"}`}>{ds.label}</div>
                      <div className="text-xs text-gray-500">
                        {d === "compact" && "More rows, smaller text — best for detail-heavy decks"}
                        {d === "standard" && "Balanced layout — the default"}
                        {d === "expanded" && "Larger text, more whitespace — best for presentations"}
                      </div>
                    </div>
                    {active && <span className="text-blue-600 text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── SLIDE SELECTION ── */}
          <Section title="Slides to Include">
            {/* Core group */}
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Core Slides</span>
                <button onClick={() => toggleAllSlides("Core", !coreEnabled)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  {coreEnabled ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {SLIDE_LABELS.filter(s => s.group === "Core").map(s => (
                  <div key={s.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <Toggle checked={config.slides[s.key]} onChange={() => setSlide(s.key, !config.slides[s.key])} />
                  </div>
                ))}
              </div>
            </div>

            {/* AI group */}
            <div className="rounded-xl border border-amber-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">AI Slides</span>
                  <span className="text-xs bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-semibold">Claude</span>
                </div>
                <button onClick={() => toggleAllSlides("AI", !aiEnabled)} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
                  {aiEnabled ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="divide-y divide-amber-100">
                {SLIDE_LABELS.filter(s => s.group === "AI").map(s => (
                  <div key={s.key} className="flex items-center justify-between px-4 py-2.5 hover:bg-amber-50">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <Toggle checked={config.slides[s.key]} onChange={() => setSlide(s.key, !config.slides[s.key])} />
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ── AI TONE ── */}
          <Section title="AI Content Tone">
            <div className="space-y-2">
              {AI_TONES.map(t => {
                const active = config.aiTone === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => set("aiTone", t.key)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      active ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-amber-300"
                    }`}
                  >
                    <span className="text-lg mt-0.5">
                      {t.key === "strategic" ? "🎯" : t.key === "technical" ? "⚙️" : "⚡"}
                    </span>
                    <div>
                      <div className={`text-sm font-semibold ${active ? "text-amber-900" : "text-gray-800"}`}>{t.label}</div>
                      <div className="text-xs text-gray-500">{t.desc}</div>
                    </div>
                    {active && <span className="ml-auto text-amber-600 text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── BRANDING ── */}
          <Section title="Branding & Labels">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo / Company Badge Text</label>
                <input
                  value={config.companyLogoText}
                  onChange={e => set("companyLogoText", e.target.value.slice(0, 6))}
                  maxLength={6}
                  placeholder="SAP"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Appears on the title slide badge (max 6 chars)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confidentiality Label</label>
                <div className="grid grid-cols-2 gap-2">
                  {CONFIDENTIALITY_OPTIONS.map(opt => (
                    <button
                      key={opt || "none"}
                      onClick={() => set("confidentialityLabel", opt)}
                      className={`py-2 px-3 rounded-lg border-2 text-xs text-left transition-all ${
                        config.confidentialityLabel === opt
                          ? "border-blue-600 bg-blue-50 text-blue-800 font-semibold"
                          : "border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {opt || "(none)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200">
                <div>
                  <div className="text-sm font-medium text-gray-800">Slide Numbers</div>
                  <div className="text-xs text-gray-500">Show slide number in footer</div>
                </div>
                <Toggle checked={config.showSlideNumbers} onChange={() => set("showSlideNumbers", !config.showSlideNumbers)} />
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {Object.values(config.slides).filter(Boolean).length} / {Object.keys(config.slides).length} slides enabled
            </span>
            <button
              onClick={() => {
                import("../types/outputConfig").then(m => onChange({ ...m.DEFAULT_CONFIG }));
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
