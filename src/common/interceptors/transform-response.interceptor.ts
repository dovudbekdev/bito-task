import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiSuccessResponse,
} from '../interfaces/api-response.interface';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload) => this.formatSuccessResponse(payload, response.statusCode, request.requestId)),
    );
  }

  private formatSuccessResponse(
    payload: unknown,
    statusCode: number,
    requestId?: string,
  ): ApiSuccessResponse {
    if (this.isApiSuccessResponse(payload)) {
      return {
        ...payload,
        requestId: payload.requestId ?? requestId ?? '',
      };
    }

    const { data, meta, message } = this.extractPayload(payload);

    return {
      success: true,
      statusCode,
      message: message ?? this.getDefaultSuccessMessage(statusCode),
      data: data ?? null,
      requestId: requestId ?? '',
      meta: meta ?? null,
    };
  }

  private extractPayload(payload: unknown): {
    data: unknown;
    meta: Record<string, unknown> | null;
    message?: string;
  } {
    if (!payload || typeof payload !== 'object') {
      return { data: payload ?? null, meta: null };
    }

    const record = payload as Record<string, unknown>;

    if ('data' in record && ('meta' in record || 'message' in record)) {
      return {
        data: record.data ?? null,
        meta: this.normalizeMeta(record.meta),
        message: typeof record.message === 'string' ? record.message : undefined,
      };
    }

    if (this.isPaginatedPayload(record)) {
      return {
        data: record.data ?? null,
        meta: this.normalizeMeta(record.meta),
      };
    }

    return { data: payload, meta: null };
  }

  private isApiSuccessResponse(payload: unknown): payload is ApiSuccessResponse {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const record = payload as Record<string, unknown>;
    return record.success === true && 'statusCode' in record && 'data' in record;
  }

  private isPaginatedPayload(payload: Record<string, unknown>): boolean {
    return 'data' in payload && 'meta' in payload;
  }

  private normalizeMeta(meta: unknown): Record<string, unknown> | null {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      return null;
    }

    return meta as Record<string, unknown>;
  }

  private getDefaultSuccessMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      200: 'Request completed successfully',
      201: 'Resource created successfully',
      202: 'Request accepted',
      204: 'Request completed successfully',
    };

    return messages[statusCode] ?? 'Request completed successfully';
  }
}
