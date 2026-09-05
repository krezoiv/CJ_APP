/**
 * Every successful NestJS response is wrapped by the API's global
 * ResponseInterceptor as `{ success: true, data: T }` — error responses are
 * NOT wrapped this way (GlobalExceptionFilter returns a flat
 * `{ success: false, statusCode, message }` shape instead), so only success
 * bodies need unwrapping.
 */
export interface ApiSuccessResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
