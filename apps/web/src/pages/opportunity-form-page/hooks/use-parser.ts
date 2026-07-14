import { useState } from "react";

import { api } from "../../../lib/api";
import type { ParserRunState } from "../../../lib/parser-run";
import type { ParsedJobDescription } from "../types";
import { friendlyParseError, sleep } from "../utils";

export function useParser() {
  const [parseResult, setParseResult] = useState<ParsedJobDescription | null>(null);
  const [runState, setRunState] = useState<ParserRunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Paste raw company or job text, review the parsed opportunity, then save."
  );
  const [progress, setProgress] = useState(0);

  const isBusy =
    runState === "validating_input" ||
    runState === "sending_to_api" ||
    runState === "extracting_fields" ||
    runState === "normalizing_result";

  const runParser = async (inputText: string) => {
    const trimmed = inputText.trim();
    setRunError(null);
    setParseResult(null);
    setProgress(8);
    setRunState("validating_input");
    setStatusMessage("Checking the pasted text and preparing it for parsing.");

    if (trimmed.length < 20) {
      await sleep(120);
      const message = "Paste at least a few lines so the parser has enough context to work with.";
      setRunError(message);
      setStatusMessage("The pasted text is too short to parse reliably.");
      setProgress(100);
      setRunState("failed");
      return;
    }

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return 88;
        if (current < 35) return current + 1;
        if (current < 60) return current + 2;
        return current + 1;
      });
    }, 180);

    try {
      await sleep(120);
      setRunState("sending_to_api");
      setStatusMessage("Sending the text to the AI parser.");

      const parsePromise = api.parseJob(trimmed);
      await sleep(160);
      setRunState("extracting_fields");
      setStatusMessage("The AI is extracting company, role, and process details.");

      const parsed = await parsePromise;
      console.log("[PARSER HOOK] Received parsed result:", parsed);
      console.log("[PARSER HOOK] companyName:", parsed.companyName);
      console.log("[PARSER HOOK] product:", parsed.product);
      console.log("[PARSER HOOK] Full object:", JSON.stringify(parsed, null, 2));

      setRunState("normalizing_result");
      setStatusMessage("Normalizing the structured result for review.");
      setProgress(90);
      setRunState("completed");
      await sleep(100);
      setProgress(100);
      setParseResult(parsed);
      setStatusMessage("Ready for review.");
    } catch (error) {
      const message = friendlyParseError(error);
      setRunError(message);
      setStatusMessage(message);
      setProgress(100);
      setRunState("failed");
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  return {
    parseResult,
    setParseResult,
    runState,
    setRunState,
    runError,
    statusMessage,
    setStatusMessage,
    progress,
    setProgress,
    isBusy,
    runParser,
  };
}
