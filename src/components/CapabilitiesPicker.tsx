import { useState, useMemo } from "react";
import { AMS_ARCHITECTURE, type AmsNode, type AmsSection } from "../data/amsArchitectureData";

interface Props {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

// Collect all leaf texts within a subtree
function leafTexts(node: AmsNode): string[] {
  if (!node.children?.length) return [node.text];
  return node.children.flatMap(leafTexts);
}

function sectionLeafCount(sec: AmsSection): number {
  return sec.tree.flatMap(leafTexts).length;
}

function sectionSelectedCount(sec: AmsSection, selected: Set<string>): number {
  return sec.tree.flatMap(leafTexts).filter(t => selected.has(t)).length;
}

// A recursive tree row
function TreeNode({
  node,
  depth,
  selected,
  onChange,
  color,
  searchQ,
}: {
  node: AmsNode;
  depth: number;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  color: string;
  searchQ: string;
}) {
  const leaves = useMemo(() => leafTexts(node), [node]);
  const isLeaf = !node.children?.length;
  const allChecked = leaves.every(t => selected.has(t));
  const someChecked = !allChecked && leaves.some(t => selected.has(t));
  const [open, setOpen] = useState(depth < 1);

  // search visibility
  const q = searchQ.toLowerCase();
  const matchesSelf = q ? node.text.toLowerCase().includes(q) : true;
  const matchesDescendant = q
    ? leaves.some(l => l.toLowerCase().includes(q)) || matchesSelf
    : true;
  if (q && !matchesDescendant) return null;

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = new Set(selected);
    if (e.target.checked) leaves.forEach(l => next.add(l));
    else leaves.forEach(l => next.delete(l));
    onChange(next);
  }

  const indent = depth * 16;

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-colors
          ${isLeaf ? "hover:bg-gray-50" : "hover:bg-gray-50/80"}`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {/* expand/collapse toggle for non-leaves */}
        {!isLeaf && (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs font-bold"
          >
            {open ? "▾" : "▸"}
          </button>
        )}
        {isLeaf && <span className="w-4 flex-shrink-0" />}

        {/* checkbox */}
        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = someChecked; }}
          onChange={toggle}
          className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-pointer accent-blue-600"
        />

        {/* label */}
        <span
          className={`text-sm flex-1 leading-tight ${
            isLeaf
              ? allChecked
                ? "text-blue-700 font-medium"
                : "text-gray-700"
              : "font-semibold text-gray-800"
          }`}
          onClick={() => !isLeaf && setOpen(o => !o)}
        >
          {node.text}
        </span>

        {/* selected count badge for non-leaves */}
        {!isLeaf && someChecked && (
          <span className="text-xs text-blue-600 font-semibold flex-shrink-0">
            {leaves.filter(t => selected.has(t))}/{leaves.length}
          </span>
        )}
        {!isLeaf && allChecked && (
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 rounded flex-shrink-0">
            ✓ all
          </span>
        )}
      </div>

      {!isLeaf && (open || q) && (
        <div>
          {node.children!.map((child, i) => (
            <TreeNode
              key={i}
              node={child}
              depth={depth + 1}
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

export default function CapabilitiesPicker({ selected, onChange }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [search, setSearch] = useState("");

  const activeSec = AMS_ARCHITECTURE[activeIdx];
  const total = selected.size;

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

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-blue-900">
            {total} {total === 1 ? "capability" : "capabilities"} selected
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Selected capabilities will appear as AMS scope items in the output deck
          </p>
        </div>
        {total > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Section tab pills */}
      <div className="flex gap-2 flex-wrap">
        {AMS_ARCHITECTURE.map((sec, i) => {
          const selCount = sectionSelectedCount(sec, selected);
          const leafCount = sectionLeafCount(sec);
          const isActive = i === activeIdx;
          return (
            <button
              key={sec.section}
              onClick={() => { setActiveIdx(i); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? "text-white border-transparent shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
              style={isActive ? { backgroundColor: sec.color, borderColor: sec.color } : {}}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isActive ? "rgba(255,255,255,0.8)" : sec.color }}
              />
              {sec.section}
              {selCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                }`}>
                  {selCount}/{leafCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + section controls */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${activeSec.section} capabilities…`}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={selectAllSection}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap"
        >
          Select all
        </button>
        <button
          onClick={clearSection}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      {/* Tree */}
      <div
        className="border border-gray-200 rounded-xl bg-white overflow-y-auto"
        style={{ maxHeight: "420px" }}
      >
        <div
          className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-gray-100 flex items-center gap-2"
          style={{ color: activeSec.color }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeSec.color }}
          />
          {activeSec.section}
        </div>
        <div className="py-1">
          {activeSec.tree.map((node, i) => (
            <TreeNode
              key={i}
              node={node}
              depth={0}
              selected={selected}
              onChange={onChange}
              color={activeSec.color}
              searchQ={search}
            />
          ))}
        </div>
      </div>

      {/* Quick-select chips for common patterns */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "All Basis", idx: 0 },
          { label: "All Security", idx: 1 },
          { label: "All SolMan/cALM", idx: 2 },
        ].map(({ label, idx }) => {
          const sec = AMS_ARCHITECTURE[idx];
          const leaves = sec.tree.flatMap(leafTexts);
          const allSel = leaves.every(t => selected.has(t));
          return (
            <button
              key={label}
              onClick={() => {
                const next = new Set(selected);
                if (allSel) leaves.forEach(t => next.delete(t));
                else leaves.forEach(t => next.add(t));
                onChange(next);
              }}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                allSel
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-gray-200 hover:border-gray-300 text-gray-600"
              }`}
            >
              {allSel ? "✓ " : "+ "}{label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
