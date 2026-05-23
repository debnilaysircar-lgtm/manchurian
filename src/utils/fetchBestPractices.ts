export interface BestPracticesResponse {
  implementationApproach: {
    title: string;
    phases: Array<{ phase: string; activities: string[] }>;
  };
  criticalSuccessFactors: Array<{ factor: string; description: string }>;
  riskRegister: Array<{
    risk: string;
    impact: "High" | "Medium" | "Low";
    probability: "High" | "Medium" | "Low";
    mitigation: string;
  }>;
  integrationBestPractices: string[];
  keyRecommendations: string[];
}

export async function fetchBestPractices(
  productNames: string[],
  projectName?: string
): Promise<BestPracticesResponse> {
  const response = await fetch("/api/best-practices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ products: productNames, projectName }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}
