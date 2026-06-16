export function formatCompactFunding(value?: string | null) {
  if (!value) {
    return "-";
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const lower = normalized.toLowerCase();
  const stageMatch = normalized.match(/\b(seed|pre-seed|series a|series b|series c|series d|series e|bridge|round)\b/i);
  const stage = stageMatch?.[1]
    ? stageMatch[1].replace(/\bseries ([a-e])\b/i, "Series $1").replace(/\bpre-seed\b/i, "Pre-seed").replace(/\bseed\b/i, "Seed")
    : null;

  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(million|m|billion|b|k)?(?:\s*(usd|\$))?/i);
  const amount = amountMatch?.[1] ?? null;
  const unit = amountMatch?.[2]?.toLowerCase() ?? null;
  const currency = amountMatch?.[3]?.toLowerCase() ?? null;

  if (!amount) {
    return stage ? stage : normalized;
  }

  const suffix =
    unit === "billion" || unit === "b"
      ? "B"
      : unit === "k"
        ? "K"
        : "M";

  const currencyPrefix = currency === "$" || currency === "usd" || lower.includes("usd") ? "$" : "$";
  return `${amount}${suffix}${currencyPrefix}${stage ? ` ${stage}` : ""}`.replace(/\s+/g, " ").trim();
}
