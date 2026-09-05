import { HttpErrorResponse } from '@angular/common/http';

/**
 * Backend error bodies are `{ success: false, statusCode, message }` — message
 * is a string for domain/HTTP errors, or a string[] for class-validator
 * failures. Never surfaces the raw HttpErrorResponse (stack traces, internal
 * details) to the user.
 */
export function extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
  const message = (error.error as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) {
    return message.join(' ');
  }
  if (typeof message === 'string') {
    return message;
  }
  return fallback;
}
