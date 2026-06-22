/**
 * Simple LLM fallback for person research when Exa fails
 * Uses Perplexity API with built-in web search
 */

import { z } from "zod";

const llmPersonResultSchema = z.object({
  status: z.enum(["found", "not_found", "needs_review"]),
  confidence: z.enum(["high", "medium", "low"]),
  person: z.object({
    fullName: z.string().optional(), // Optional when not found
    currentTitle: z.string().nullable().optional(),
    currentCompany: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    summary: z.string().nullable().optional()
  }),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string().nullable().optional()
  }))
});

type LLMPersonResult = z.infer<typeof llmPersonResultSchema>;

export async function llmPersonResearch(params: {
  name: string;
  company?: string;
  linkedinUrl?: string;
}): Promise<LLMPersonResult | null> {
  const { name, company, linkedinUrl } = params;

  console.log('[LLM FALLBACK] Query:', { name, company, linkedinUrl });

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('[LLM FALLBACK] No Perplexity API key configured');
    return null;
  }

  const systemPrompt = `Find the person on LinkedIn and return their profile information as JSON.

Rules:
- Search individual profiles (linkedin.com/in/...), not company pages
- If found, return status="found"
- Return verified facts only`;

  // Build simple prompt matching Exa input
  let searchPrompt = `Find ${name}`;
  if (company) {
    searchPrompt += ` from ${company}`;
  }
  if (linkedinUrl) {
    searchPrompt += `. Check this LinkedIn: ${linkedinUrl}`;
  }
  searchPrompt += ' on LinkedIn';

  console.log('[PERPLEXITY] Query:', searchPrompt);

  const userPrompt = `${searchPrompt}

Return JSON:
{
  "status": "found" | "not_found" | "needs_review",
  "confidence": "high" | "medium" | "low",
  "person": {
    "fullName": string,
    "currentTitle"?: string,
    "currentCompany"?: string,
    "linkedinUrl"?: string,
    "location"?: string,
    "summary"?: string
  },
  "sources": [{
    "title": string,
    "url": string,
    "snippet"?: string
  }]
}`;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM FALLBACK] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('[LLM FALLBACK] No content in response');
      return null;
    }

    // Perplexity may wrap JSON in markdown code blocks
    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const parsed = JSON.parse(jsonText);
    const validated = llmPersonResultSchema.parse(parsed);

    console.log('[LLM FALLBACK] Result:', validated.status);
    return validated;
  } catch (error) {
    console.error('[LLM FALLBACK] Error:', error);
    return null;
  }
}
