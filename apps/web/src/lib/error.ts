export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "Something went wrong. Please try again.";
}

export async function getApiErrorMessage(response: Response) {
  const text = await response.text();
  const fallback = `Request failed with status ${response.status}`;

  if (!text.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(text) as { message?: unknown; error?: unknown };

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }

    if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
      return parsed.error;
    }
  } catch {
    // Keep the raw text fallback below.
  }

  return text.trim().length > 0 ? text.trim() : fallback;
}
