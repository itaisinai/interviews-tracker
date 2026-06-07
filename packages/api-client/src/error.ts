export function getApiErrorMessage(response: Response) {
  return response
    .json()
    .then((body) => {
      if (body && typeof body === "object" && "message" in body && typeof (body as { message?: unknown }).message === "string") {
        return (body as { message: string }).message;
      }

      return response.statusText || "Request failed";
    })
    .catch(() => response.statusText || "Request failed");
}
