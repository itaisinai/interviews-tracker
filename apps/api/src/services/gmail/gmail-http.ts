type GoogleErrorBody = {
  error?: string;
  error_description?: string;
};

export class GmailApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly googleError?: string,
    readonly googleErrorDescription?: string
  ) {
    super(message);
    this.name = "GmailApiRequestError";
  }
}

async function parseGoogleError(response: Response) {
  const text = await response.text();

  try {
    return JSON.parse(text) as GoogleErrorBody;
  } catch {
    return { error_description: text };
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await parseGoogleError(response);
    throw new GmailApiRequestError(
      `Gmail API request failed: ${response.status}`,
      response.status,
      body.error,
      body.error_description
    );
  }

  return response.json() as Promise<T>;
}
