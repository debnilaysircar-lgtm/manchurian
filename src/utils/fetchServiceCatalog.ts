import type { ServiceCatalogEntry } from "../types/serviceCatalog";

export async function fetchServiceCatalog(
  productNames: string[],
  projectName: string,
  clientContext: string,
): Promise<ServiceCatalogEntry[]> {
  const response = await fetch("/api/service-catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: productNames, projectName, clientContext }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  // Ensure each entry has a stable id
  return data.map((e: ServiceCatalogEntry, i: number) => ({
    ...e,
    id: e.id || `svc-${i}`,
  }));
}
