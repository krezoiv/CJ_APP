import { HttpErrorResponse } from '@angular/common/http';

/**
 * A `responseType: 'blob'` request (the PDF export calls) still gets the
 * backend's real JSON error body on failure — Angular just hands it back as
 * a `Blob` instead of parsed JSON, since the request's expected type was set
 * before the response arrived. This reads that blob back to text and parses
 * it, so an export failure can surface the same real backend message
 * `extractErrorMessage` gives every other request instead of a generic string.
 */
export async function extractBlobErrorMessage(
  error: HttpErrorResponse,
  fallback: string,
): Promise<string> {
  if (!(error.error instanceof Blob)) {
    return fallback;
  }
  try {
    const text = await error.error.text();
    const parsed = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(' ');
    }
    return parsed.message ?? fallback;
  } catch {
    return fallback;
  }
}
