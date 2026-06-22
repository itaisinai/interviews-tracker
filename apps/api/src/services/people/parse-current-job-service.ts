/**
 * Service for parsing current job description text and updating experience timeline
 */

import { z } from "zod";

const parsedJobSchema = z.object({
  currentJob: z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(), // Format: "MMM YYYY" like "Mar 2024"
    description: z.string().optional()
  }),
  adjustedPreviousJob: z.object({
    company: z.string(),
    title: z.string(),
    startDate: z.string(),
    endDate: z.string() // Adjusted to match current job start date
  }).optional().nullable(),
  reasoning: z.string().optional()
});

type ParsedJob = z.infer<typeof parsedJobSchema>;

export async function parseCurrentJobDescription(
  jobDescriptionText: string,
  currentExperience: Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }>
): Promise<ParsedJob> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  // Log the current experience data for debugging
  console.log('[PARSE JOB] Current experience data:', JSON.stringify(currentExperience, null, 2));

  // Build current experience context
  // IMPORTANT: If the first position has no dates, treat it as "Present" (current job)
  const experienceContext = currentExperience.map((exp, index) => {
    const positions = exp.positions.map(pos => {
      let dates = pos.dates || "Unknown dates";
      // If this is the first position (index 0) and has no dates, assume it's current
      if (index === 0 && !pos.dates) {
        dates = "Present (currently employed, no end date stored)";
      }
      return `  - ${pos.title} (${dates})`;
    }).join("\n");
    return `${index + 1}. ${exp.company}\n${positions}`;
  }).join("\n\n");

  console.log('[PARSE JOB] Experience context for LLM:\n', experienceContext);

  const systemPrompt = `You are a job timeline parser. Parse the provided job description text and extract the current position details.

IMPORTANT: If the current job's start date conflicts with an existing position that is currently employed, you MUST adjust that previous job's end date to be one month before the current job's start date.

Rules:
1. Extract company name, job title, start date (format: "MMM YYYY")
2. Check if ANY existing position is marked as currently employed:
   - Has "Present" in its dates field (e.g., "Jan 2020 - Present")
   - Has "Present (currently employed, no end date stored)"
   - Is the first position with "Unknown dates" (assumed to be current)
3. If found, calculate the end date as one month before the new job's start date
4. Include the adjusted job with its company, title, start date, and new end date
5. If no adjustment needed (no position currently employed), set adjustedPreviousJob to null

Return JSON:
{
  "currentJob": {
    "company": string,
    "title": string,
    "startDate": "MMM YYYY",
    "description": string (optional)
  },
  "adjustedPreviousJob": {
    "company": string,
    "title": string,
    "startDate": "MMM YYYY",
    "endDate": "MMM YYYY" (adjusted to one month before new job starts)
  } | null,
  "reasoning": string (explain what changed and why)
}`;

  const userPrompt = `Current experience timeline:
${experienceContext}

New job description text to parse:
"""
${jobDescriptionText}
"""

Extract the current job details and determine if any previous job needs its end date adjusted.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[PARSE JOB] API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error("[PARSE JOB] No content in response");
      throw new Error("No content returned from OpenAI API");
    }

    // Parse JSON from response (OpenAI may wrap in markdown code blocks)
    let jsonText = content.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7, -3).trim();
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3, -3).trim();
    }

    const parsed = JSON.parse(jsonText);
    const validated = parsedJobSchema.parse(parsed);

    console.log("[PARSE JOB] Successfully parsed:", validated);
    return validated;
  } catch (error) {
    console.error("[PARSE JOB] Error:", error);
    throw new Error(`Failed to parse job description: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Apply parsed job data to existing experience timeline
 */
export function applyParsedJobToTimeline(
  parsedJob: ParsedJob,
  currentExperience: Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }>
): Array<{
  company: string;
  companyUrl?: string;
  totalDuration?: string;
  positions: Array<{
    title: string;
    dates?: string;
    duration?: string;
    description?: string;
  }>;
}> {
  const newExperience = currentExperience.map((experience) => ({
    ...experience,
    positions: experience.positions.map((position) => ({ ...position })),
  }));

  // Update adjusted previous job if needed
  if (parsedJob.adjustedPreviousJob) {
    const adjustedJob = parsedJob.adjustedPreviousJob;
    const companyIndex = newExperience.findIndex(
      exp => exp.company === adjustedJob.company
    );

    if (companyIndex !== -1) {
      // Update the position with "Present" OR no dates (assumed current) to the new end date
      const company = newExperience[companyIndex];
      const presentPosition = company.positions.find(pos =>
        pos.dates?.includes("Present") || !pos.dates
      );

      if (presentPosition) {
        presentPosition.dates = `${adjustedJob.startDate} - ${adjustedJob.endDate}`;
        // Remove duration since it's now outdated
        delete presentPosition.duration;
      }
    }
  }

  // Add the new current job at the beginning
  newExperience.unshift({
    company: parsedJob.currentJob.company,
    positions: [
      {
        title: parsedJob.currentJob.title,
        dates: `${parsedJob.currentJob.startDate} - Present`,
        description: parsedJob.currentJob.description
      }
    ]
  });

  return newExperience;
}
