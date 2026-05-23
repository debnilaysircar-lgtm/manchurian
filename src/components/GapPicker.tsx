import { useState } from "react";
import { GAP_ARCHITECTURE, type GapNode } from "../data/gapArchitectureData";

interface Props {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

function leafTexts(node: GapNode): string[] {
  if (!node.children?.length) return [node.text];
  return node.children.flatMap(leafTexts);
}

function DomainBlock({
  node,
  selected,
  onChange,
  color,
  searchQ,
}: {
  node: GapNode;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  color: string;
  searchQ: string;
}) {
  const leaves = leafTexts(node);
  const allChecked = leaves.every(t => selected.has(t));
  const someChecked = !allChecked && leaves.some(t => selected.has(t));
  const [open, setOpen] = useState(false);
  const isLeaf = !node.children?.length;

  const q = searchQ.toLowerCase();
  const visible = !q || leaves.some(l => l.toLowerCase().includes(q)) || node.text.toLowerCase().includes(q);
  if (!visible) return null;

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = new Set(selected);
    if (e.target.checked) leaves.forEach(l => next.add(l));
    else leaves.forEach(l => next.delete(l));
    onChange(next);
  }

  if (isLeaf) {
    const matches = !q || node.text.toLowerCase().includes(q);
    if (!matches) return null;
    return (
      <label className="flex items-start gap-2 px-3 py-1.5 hover:bg-red-50/40 rounded-lg cursor-pointer group">
        <input
          type="checkbox"
          checked={selected.has(node.text)}
          onChange={e => {
            const next = new Set(selected);
            if (e.target.checked) next.add(node.text);
            else next.delete(node.text);
            onChange(next);
          }}
          className="mt-0.5 w-3.5 h-3.5 rounded flex-shrink-0 cursor-pointer accent-red-500"
        />
        <span className={`text-xs leading-tight flex-1 ${selected.has(node.text) ? "text-red-700 font-medium line-through opacity-70" : "text-gray-600"}`}>
          {node.text}
        </span>
      </label>
    );
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden mb-1.5">
      <div
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <button className="text-gray-400 text-xs font-bold w-3 flex-shrink-0">
          {open ? "▾" : "▸"}
        </button>
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = someChecked; }}
          onChange={toggle}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-pointer accent-red-500"
        />
        <span className="text-xs font-semibold text-gray-700 flex-1">{node.text}</span>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {leaves.filter(t => selected.has(t))}/{leaves.length}
        </span>
      </div>
      {open && (
        <div className="py-1">
          {node.children!.map((child, i) => (
            <DomainBlock
              key={i}
              node={child}
              selected={selected}
              onChange={onChange}
              color={color}
              searchQ={searchQ}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GapPicker({ selected, onChange }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(true);

  const activeSec = GAP_ARCHITECTURE[activeIdx];
  const totalSelected = GAP_ARCHITECTURE.flatMap(s => s.tree.flatMap(leafTexts)).filter(t => selected.has(t)).length;

  function selectAllSection() {
    const next = new Set(selected);
    activeSec.tree.flatMap(leafTexts).forEach(t => next.add(t));
    onChange(next);
  }

  function clearSection() {
    const next = new Set(selected);
    activeSec.tree.flatMap(leafTexts).forEach(t => next.delete(t));
    onChange(next);
  }

  return (
    <div className="border border-red-200 rounded-xl overflow-hidden">
      {/* header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-base">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-900">
            EMEA Architecture Gap Items — Out of Scope
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            144 capabilities not covered by SAP AMS Architecture. Select which gaps to flag as out-of-scope.
            {totalSelected > 0 && <span className="font-bold"> {totalSelected} selected.</span>}
          </p>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? "▾" : "▸"}</span>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 bg-white">
          {/* section tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {GAP_ARCHITECTURE.map((sec, i) => {
              const secLeaves = sec.tree.flatMap(leafTexts);
              const selCount = secLeaves.filter(t => selected.has(t)).length;
              const isActive = i === activeIdx;
              return (
                <button
                  key={sec.section}
                  onClick={() => { setActiveIdx(i); setSearch(""); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isActive ? "text-gray-900 border-transparent" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                  style={isActive ? { backgroundColor: sec.color + "33", borderColor: sec.color } : {}}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sec.color }} />
                  {sec.section}
                  <span
                    className="ml-1 text-xs font-bold"
                    style={{ color: isActive ? "#991b1b" : "#9ca3af" }}
                  >
                    {sec.gapCount}
                  </span>
                  {selCount > 0 && (
                    <span className="ml-0.5 bg-red-100 text-red-700 px-1 rounded-full text-xs font-bold">
                      {selCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* search + bulk */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search gap items…"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-300 outline-none"
              />
            </div>
            <button onClick={selectAllSection} className="text-xs px-2.5 py-1.5 border border-red-200 rounded-lg text-red-700 hover:bg-red-50 font-medium whitespace-nowrap">
              All {activeSec.section}
            </button>
            <button onClick={clearSection} className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">
              Clear
            </button>
          </div>

          {/* tree */}
          <div className="overflow-y-auto border border-gray-100 rounded-lg" style={{ maxHeight: "320px" }}>
            <div className="p-2">
              {activeSec.tree.map((node, i) => (
                <DomainBlock
                  key={i}
                  node={node}
                  selected={selected}
                  onChange={onChange}
                  color={activeSec.color}
                  searchQ={search}
                />
              ))}
            </div>
          </div>

          {totalSelected > 0 && (
            <p className="text-xs text-red-600 font-medium">
              ✓ {totalSelected} gap items will be listed as Out of Scope in the output deck.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
