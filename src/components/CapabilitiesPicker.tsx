import { useState, useMemo } from "react";
import { AMS_ARCHITECTURE, type AmsNode } from "../data/amsArchitectureData";
import type { SAPProduct } from "../data/sapProducts";

interface Props {
  products: SAPProduct[];
  selected: Map<string, Set<string>>;   // productId → Set<capabilityLeafText>
  onChange: (next: Map<string, Set<string>>) => void;
}

function leafTexts(node: AmsNode): string[] {
  if (!node.children?.length) return [node.text];
  return node.children.flatMap(leafTexts);
}

function TreeNode({
  node, depth, selected, onChange, color, searchQ,
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
  const [open, setOpen] = useState(depth < 2);

  const q = searchQ.toLowerCase();
  const matchesDescendant = q
    ? leaves.some(l => l.toLowerCase().includes(q)) || node.text.toLowerCase().includes(q)
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
        className={`flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-colors ${isLeaf ? "hover:bg-gray-50" : "hover:bg-gray-50/80"}`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {!isLeaf && (
          <button
            onClick={() => setOpen(o => !o)}
            className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs font-bold"
          >
            {open ? "▾" : "▸"}
          </button>
        )}
        {isLeaf && <span className="w-4 flex-shrink-0" />}

        <input
          type="checkbox"
          checked={allChecked}
          ref={el => { if (el) el.indeterminate = someChecked; }}
          onChange={toggle}
          className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-pointer accent-blue-600"
        />

        <span
          className={`text-sm flex-1 leading-tight ${
            isLeaf
              ? allChecked ? "text-blue-700 font-medium" : "text-gray-700"
              : "font-semibold text-gray-800"
          }`}
          onClick={() => !isLeaf && setOpen(o => !o)}
        >
          {node.text}
        </span>

        {!isLeaf && someChecked && (
          <span className="text-xs text-blue-600 font-semibold flex-shrink-0">
            {leaves.filter(t => selected.has(t))}/{leaves.length}
          </span>
        )}
        {!isLeaf && allChecked && (
          <span className="text-xs bg-blue-100 text-blue-700 font-bold px-1.5 rounded flex-shrink-0">✓ all</span>
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

export default function CapabilitiesPicker({ products, selected, onChange }: Props) {
  const [activeProductIdx, setActiveProductIdx] = useState(0);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [search, setSearch] = useState("");

  const allAmsLeaves = useMemo(() => AMS_ARCHITECTURE.flatMap(s => s.tree.flatMap(leafTexts)), []);

  const totalUnion = useMemo(() => {
    const union = new Set<string>();
    selected.forEach(caps => caps.forEach(t => union.add(t)));
    return union.size;
  }, [selected]);

  if (products.length === 0) {
    return (
      <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
        ⚠ Return to SAP Products step and select at least one product first.
      </p>
    );
  }

  const safeIdx = Math.min(activeProductIdx, products.length - 1);
  const activeProduct = products[safeIdx];
  const productCaps = selected.get(activeProduct.id) ?? new Set<string>();

  function updateProductCaps(next: Set<string>) {
    const m = new Map(selected);
    m.set(activeProduct.id, next);
    onChange(m);
  }

  function clearProduct() {
    const m = new Map(selected);
    m.set(activeProduct.id, new Set());
    onChange(m);
  }

  const activeSec = AMS_ARCHITECTURE[activeSectionIdx];
  const secLeaves = activeSec.tree.flatMap(leafTexts);

  function selectAllSection() {
    const next = new Set(productCaps);
    secLeaves.forEach(t => next.add(t));
    updateProductCaps(next);
  }

  function clearSection() {
    const next = new Set(productCaps);
    secLeaves.forEach(t => next.delete(t));
    updateProductCaps(next);
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
        <div>
          <p className="text-sm font-bold text-blue-900">
            {totalUnion} {totalUnion === 1 ? "capability" : "capabilities"} selected (across all products)
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            {totalUnion > 0
              ? `${allAmsLeaves.length - totalUnion} unselected capabilities will be added as out-of-scope`
              : "Select capabilities per product — anything not selected becomes out-of-scope"}
          </p>
        </div>
        {totalUnion > 0 && (
          <button
            onClick={() => onChange(new Map())}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium underline flex-shrink-0 ml-4"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Product tabs */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Product</p>
        <div className="flex gap-2 flex-wrap">
          {products.map((p, i) => {
            const caps = selected.get(p.id) ?? new Set<string>();
            const isActive = activeProduct.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setActiveProductIdx(i); setSearch(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {p.name}
                {caps.size > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                  }`}>
                    {caps.size}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AMS section tabs */}
      <div className="flex gap-2 flex-wrap">
        {AMS_ARCHITECTURE.map((sec, i) => {
          const sLeaves = sec.tree.flatMap(leafTexts);
          const selCount = sLeaves.filter(t => productCaps.has(t)).length;
          const isActive = i === activeSectionIdx;
          return (
            <button
              key={sec.section}
              onClick={() => { setActiveSectionIdx(i); setSearch(""); }}
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
                  {selCount}/{sLeaves.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search + controls */}
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
        <button onClick={selectAllSection} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap">
          All {activeSec.section.split(" ")[0]}
        </button>
        <button onClick={clearSection} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 whitespace-nowrap">
          Clear
        </button>
        <button onClick={clearProduct} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 hover:bg-red-50 text-red-600 whitespace-nowrap">
          Clear product
        </button>
      </div>

      {/* Tree */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-y-auto" style={{ maxHeight: "560px" }}>
        <div
          className="px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-gray-100 flex items-center gap-2"
          style={{ color: activeSec.color }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeSec.color }} />
          <span className="text-gray-500 font-medium normal-case">{activeProduct.name}</span>
          <span className="text-gray-300">·</span>
          {activeSec.section}
        </div>
        <div className="py-1">
          {activeSec.tree.map((node, i) => (
            <TreeNode
              key={i}
              node={node}
              depth={0}
              selected={productCaps}
              onChange={updateProductCaps}
              color={activeSec.color}
              searchQ={search}
            />
          ))}
        </div>
      </div>

      {/* Per-product summary chips */}
      {products.length > 1 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {products.map(p => {
            const caps = selected.get(p.id);
            if (!caps || caps.size === 0) return null;
            return (
              <span key={p.id} className="text-xs px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-medium">
                {p.name}: {caps.size}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
