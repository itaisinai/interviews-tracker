import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { OpenAiParserService } from "./ai-parser-service.js";
import { buildJobParserSystemPrompt } from "./job-parser-skill.js";

const fixtureDir = fileURLToPath(new URL("./__fixtures__", import.meta.url));
const altaMessage = readFileSync(`${fixtureDir}/alta-recruiter-message.txt`, "utf8");

type AltaFixture = {
  companyName: string;
  roleTitle: string;
  pipelineType: string;
  status: string;
  company: {
    workModel: string;
    location: string;
    employees: string;
    customersTraction: string;
  };
  role: {
    techStack: string[];
  };
};

const expected = JSON.parse(readFileSync(`${fixtureDir}/alta-recruiter-message.expected.json`, "utf8")) as AltaFixture;

test("job parser prompt includes the reusable Alta guidance", () => {
  const prompt = buildJobParserSystemPrompt();

  assert.match(prompt, /AI ingestion engine for a personal Job Search CRM, not a summarizer/);
  assert.match(prompt, /Highest priority: company name, role title, process stage, recruiter or company reached out, next expected action/);
  assert.match(prompt, /Never invent salary, funding, dates, team size, customers, or technologies/);
  assert.match(prompt, /"חברת Alta" => companyName: Alta/);
  assert.match(prompt, /"התעניינה בקורות החיים שלך" => status: RECRUITER_REACHED_OUT/);
  assert.match(prompt, /"פיתוח ב- Node \+ React" => techStack: Node\.js, React/);
});

test("openai parser regression for the Alta recruiter message", async () => {
  const originalFetch = globalThis.fetch;
  const requestBodies: string[] = [];

  globalThis.fetch = (async (_input, init) => {
    requestBodies.push(String(init?.body ?? ""));

    return new Response(JSON.stringify({ output_text: JSON.stringify(expected) }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  try {
    const parser = new OpenAiParserService("test-api-key");
    const parsed = await parser.parseJobDescription(altaMessage);

    assert.equal(parsed.companyName, expected.companyName);
    assert.equal(parsed.roleTitle, expected.roleTitle);
    assert.equal(parsed.pipelineType, expected.pipelineType);
    assert.equal(parsed.status, expected.status);
    assert.equal(parsed.company.workModel, expected.company.workModel);
    assert.equal(parsed.company.location, expected.company.location);
    assert.equal(parsed.company.employees, expected.company.employees);
    assert.equal(parsed.company.customersTraction, expected.company.customersTraction);
    assert.deepEqual(parsed.role.techStack, expected.role.techStack);

    const request = JSON.parse(requestBodies[0] ?? "{}") as {
      input?: Array<{ role?: string; content?: Array<{ type?: string; text?: string }> }>;
    };
    const systemPrompt = request.input?.[0]?.content?.[0]?.text ?? "";

    assert.match(systemPrompt, /AI ingestion engine for a personal Job Search CRM, not a summarizer/);
    assert.match(systemPrompt, /"חברת Alta" => companyName: Alta/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
