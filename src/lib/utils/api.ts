import type { ApiResponse } from "@/types";

/**
 * Safely parse a fetch Response as JSON.
 * Returns a clear error if the server responded with HTML (e.g. 500 error page).
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      throw new Error(
        response.status >= 500
          ? "Server error — please restart the dev server (stop and run npm run dev again)."
          : `Unexpected server response (${response.status}). Please try again.`
      );
    }
    throw new Error(text.slice(0, 200) || `Request failed (${response.status})`);
  }

  return response.json() as Promise<ApiResponse<T>>;
}
