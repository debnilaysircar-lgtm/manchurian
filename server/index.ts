import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface BestPracticesRequest {
  products: string[];
  projectName?: string;
}

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

app.post("/api/best-practices", async (req, res) => {
  const { products, projectName } = req.body as BestPracticesRequest;

  if (!products || products.length === 0) {
    return res.status(400).json({ error: "products array is required" });
  }

  const productList = products.join(", ");
  const project = projectName || "SAP Implementation";

  const prompt = `You are a senior SAP implementation consultant with 20+ years of experience.
A client is implementing the following SAP products: ${productList}.
Project name: ${project}

Provide a best-in-class solution plan in strict JSON format (no markdown, no code fences, just raw JSON).
The JSON must match this exact structure:

{
  "implementationApproach": {
    "title": "string describing the overall approach",
    "phases": [
      { "phase": "phase name", "activities": ["activity1", "activity2", "activity3"] }
    ]
  },
  "criticalSuccessFactors": [
    { "factor": "short factor name", "description": "one sentence explanation" }
  ],
  "riskRegister": [
    {
      "risk": "risk description",
      "impact": "High|Medium|Low",
      "probability": "High|Medium|Low",
      "mitigation": "mitigation strategy"
    }
  ],
  "integrationBestPractices": ["best practice 1", "best practice 2"],
  "keyRecommendations": ["recommendation 1", "recommendation 2"]
}

Guidelines:
- implementationApproach.phases: include 5-6 phases (Prepare, Explore, Realize, Deploy, Run + any product-specific phases), each with 3-5 activities specific to the selected products
- criticalSuccessFactors: 5-7 factors specific to this product combination
- riskRegister: 5-7 risks specific to these products with realistic mitigations
- integrationBestPractices: 4-6 best practices for integrating these products together
- keyRecommendations: 4-5 concise strategic recommendations
- Be specific to the selected products — not generic SAP advice
- Base on SAP Activate methodology and current best practices

Return only raw JSON, nothing else.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return res.status(500).json({ error: "No text response from AI" });
    }

    const raw = textBlock.text.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart, jsonEnd + 1) : raw;

    const parsed: BestPracticesResponse = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err) {
    console.error("Error calling Claude API:", err);
    res.status(500).json({ error: String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Best-practices API running on http://localhost:${PORT}`);
});
