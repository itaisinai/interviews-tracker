export class ApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getApiError(response: Response) {
  return response
    .json()
    .then((body) => {
      const message = body && typeof body === "object" && "message" in body && typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message
        : response.statusText || "Request failed";
      const code = body && typeof body === "object" && "code" in body && typeof (body as { code?: unknown }).code === "string"
        ? (body as { code: string }).code
        : undefined;

      return new ApiError(message, code);
    })
    .catch(() => new ApiError(response.statusText || "Request failed"));
}

export function getApiErrorMessage(response: Response) {
  return getApiError(response).then((error) => error.message);
}
