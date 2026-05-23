export interface AutoGenerateResponse {
  scopeItems: string[];
  outOfScope: string[];
  raciEntries: Array<{
    activity: string;
    responsible: string;
    accountable: string;
    consulted: string;
    informed: string;
  }>;
  dependencies: string[];
  assumptions: string[];
}

export async function autoGenerate(
  productNames: string[],
  projectName: string,
  clientContext: string,
  tone: "strategic" | "technical" | "concise"
): Promise<AutoGenerateResponse> {
  const response = await fetch("/api/auto-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: productNames, projectName, clientContext, tone }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  return response.json();
}
