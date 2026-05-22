import { useState, useRef, useEffect } from "react";
import type { SAPProduct } from "../data/sapProducts";
import { searchSAPProducts, SAP_CATEGORIES } from "../data/sapProducts";

interface Props {
  selected: SAPProduct[];
  onChange: (products: SAPProduct[]) => void;
}

export default function ProductSearch({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SAPProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = searchSAPProducts(query).filter(p =>
      activeCategory === "All" ? true : p.category === activeCategory
    );
    setResults(filtered);
  }, [query, activeCategory]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleProduct(product: SAPProduct) {
    const exists = selected.find(p => p.id === product.id);
    if (exists) {
      onChange(selected.filter(p => p.id !== product.id));
    } else {
      onChange([...selected, product]);
    }
  }

  function removeProduct(id: string) {
    onChange(selected.filter(p => p.id !== id));
  }

  const categories = ["All", ...SAP_CATEGORIES];

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          {selected.map(p => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm"
            >
              <span className="text-blue-200 text-xs">{p.category}</span>
              <span className="mx-0.5 text-blue-300">|</span>
              {p.name}
              <button
                onClick={() => removeProduct(p.id)}
                className="ml-1 hover:text-red-200 text-blue-200 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative" ref={dropRef}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search SAP products (e.g. S/4HANA, SuccessFactors, Ariba...)"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            {/* Category filter */}
            <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-100 flex-wrap">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-blue-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {results.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No products found</div>
              ) : (
                results.map(product => {
                  const isSelected = !!selected.find(p => p.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProduct(product)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 flex items-start gap-3 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <span className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center text-xs ${
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300"
                      }`}>
                        {isSelected && "✓"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {product.category}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{product.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{product.description}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
