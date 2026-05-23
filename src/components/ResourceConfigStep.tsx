import { useMemo } from "react";
import { AMS_ARCHITECTURE } from "../data/amsArchitectureData";
import type { ResourceIntensities, DomainIntensity } from "../data/resourceMapping";

interface Props {
  selectedCapabilities: Set<string>;
  intensities: ResourceIntensities;
  onChange: (next: ResourceIntensities) => void;
}

function leavesForSection(idx: number): string[] {
  function walk(n: { text: string; children?: typeof n[] }): string[] {
    return n.children?.length ? n.children.flatMap(walk) : [n.text];
  }
  return AMS_ARCHITECTURE[idx]?.tree.flatMap(walk) ?? [];
}

const INTENSITY_OPTIONS: { value: DomainIntensity; label: string; desc: string; color: string }[] = [
  { value: 0.5, label: "Light",  desc: "0.5×",  color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: 1,   label: "Normal", desc: "1×",    color: "bg-green-50 border-green-200 text-green-700" },
  { value: 1.5, label: "Heavy",  desc: "1.5×",  color: "bg-amber-50 border-amber-300 text-amber-700" },
  { value: 2,   label: "Full",   desc: "2×",    color: "bg-red-50 border-red-300 text-red-700" },
];

const ACTIVE_COLORS: Record<DomainIntensity, string> = {
  0.5: "bg-blue-600 border-blue-600 text-white",
  1:   "bg-green-600 border-green-600 text-white",
  1.5: "bg-amber-500 border-amber-500 text-white",
  2:   "bg-red-600 border-red-600 text-white",
};

const DOMAIN_CONFIGS: { key: keyof ResourceIntensities; label: string; sectionIdx: number; icon: string; color: string }[] = [
  { key: "basis",    label: "SAP Basis",     sectionIdx: 0, icon: "⚙️",  color: "blue" },
  { key: "security", label: "SAP Security",  sectionIdx: 1, icon: "🔒",  color: "red" },
  { key: "solman",   label: "Cloud ALM",     sectionIdx: 2, icon: "📋",  color: "teal" },
];

export default function ResourceConfigStep({ selectedCapabilities, intensities, onChange }: Props) {
  const domainLeaves = useMemo(() =>
    DOMAIN_CONFIGS.map(d => ({
      ...d,
      allLeaves: leavesForSection(d.sectionIdx),
      selectedLeaves: leavesForSection(d.sectionIdx).filter(t => selectedCapabilities.has(t)),
    })),
    [selectedCapabilities]
  );

  const anyCapSelected = selectedCapabilities.size > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900">Resource Loading Configuration</h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Set the staffing intensity for each AMS domain. This scales the phase allocation percentages in the resource loading table.
        </p>
      </div>

      {!anyCapSelected && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠ No capabilities selected yet — intensities will apply to all domains. Go back to Capabilities to make a selection.
        </div>
      )}

      <div className="space-y-4">
        {domainLeaves.map(domain => {
          const hasSelection = domain.selectedLeaves.length > 0;
          const isActive = !anyCapSelected || hasSelection;
          const current = intensities[domain.key];

          return (
            <div
              key={domain.key}
              className={`rounded-xl border-2 overflow-hidden transition-opacity ${
                isActive ? "border-gray-200 opacity-100" : "border-gray-100 opacity-40"
              }`}
            >
              {/* Domain header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-base">{domain.icon}</span>
                  <span className="font-bold text-gray-800 text-sm">{domain.label}</span>
                  {anyCapSelected && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      hasSelection
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {domain.selectedLeaves.length} / {domain.allLeaves.length} capabilities selected
                    </span>
                  )}
                </div>

                {/* Intensity selector */}
                <div className="flex gap-1.5">
                  {INTENSITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      disabled={!isActive}
                      onClick={() => onChange({ ...intensities, [domain.key]: opt.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${
                        current === opt.value
                          ? ACTIVE_COLORS[opt.value]
                          : `${opt.color} hover:opacity-80`
                      }`}
                    >
                      {opt.label}
                      <span className="ml-1 opacity-70 font-normal">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected capabilities */}
              {hasSelection && (
                <div className="px-4 py-3 bg-white">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selected capabilities</p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {domain.selectedLeaves.map(leaf => (
                      <span
                        key={leaf}
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-medium"
                      >
                        {leaf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {anyCapSelected && !hasSelection && (
                <div className="px-4 py-2 bg-white">
                  <p className="text-xs text-gray-400 italic">No capabilities selected for this domain — domain will be excluded from resource loading.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Intensity legend */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Intensity guide</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div><span className="font-semibold text-blue-700">Light (0.5×)</span> — Minimal support, ad-hoc only</div>
          <div><span className="font-semibold text-green-700">Normal (1×)</span> — Standard managed service</div>
          <div><span className="font-semibold text-amber-700">Heavy (1.5×)</span> — Elevated demand, complex environment</div>
          <div><span className="font-semibold text-red-700">Full (2×)</span> — Maximum coverage, mission-critical</div>
        </div>
      </div>
    </div>
  );
}
