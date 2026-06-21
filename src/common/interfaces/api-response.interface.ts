export interface ApiSuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  requestId: string;
  meta: Record<string, unknown> | null;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  requestId: string;
  details: unknown;
}

export interface PaginatedPayload<T = unknown> {
  data: T;
  meta?: Record<string, unknown>;
}
