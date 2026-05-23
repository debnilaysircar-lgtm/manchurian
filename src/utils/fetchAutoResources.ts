import type { ResourceEntry } from "./generatePptx";
import { PHASE_LABELS } from "../data/resourceMapping";

export async function fetchAutoResources(
  productNames: string[],
  projectName: string,
  clientContext: string,
): Promise<ResourceEntry[]> {
  const response = await fetch("/api/auto-resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      products: productNames,
      projectName,
      clientContext,
      phases: PHASE_LABELS,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data: ResourceEntry[] = await response.json();
  // Ensure every entry has exactly the right phases in the right order
  return data.map(entry => ({
    ...entry,
    allocations: PHASE_LABELS.map(phase => {
      const found = entry.allocations.find(a => a.phase === phase);
      return { phase, percent: found?.percent ?? 0 };
    }),
  }));
}
