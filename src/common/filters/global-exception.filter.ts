import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

interface ValidationDetail {
  field: string;
  message: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    if (errorResponse.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${errorResponse.requestId}] ${request.method} ${request.originalUrl || request.url}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ApiErrorResponse {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, request);
    }

    if (exception instanceof QueryFailedError) {
      return this.fromDatabaseError(exception, request);
    }

    return this.fromUnknownError(exception, request);
  }

  private fromHttpException(exception: HttpException, request: Request): ApiErrorResponse {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const parsed = this.parseExceptionResponse(exceptionResponse, statusCode);

    return {
      success: false,
      statusCode,
      message: parsed.message,
      error: parsed.error,
      requestId: request.requestId ?? '',
      details: parsed.details,
    };
  }

  private fromDatabaseError(error: QueryFailedError, request: Request): ApiErrorResponse {
    const statusCode = HttpStatus.CONFLICT;
    const isDuplicateKey = (error.driverError as { code?: string })?.code === '23505';

    return {
      success: false,
      statusCode,
      message: isDuplicateKey
        ? 'Resource already exists'
        : 'Database operation failed',
      error: isDuplicateKey ? 'DUPLICATE_ENTRY' : 'DATABASE_ERROR',
      requestId: request.requestId ?? '',
      details: process.env.NODE_ENV === 'production'
        ? null
        : { query: error.query, parameters: error.parameters },
    };
  }

  private fromUnknownError(exception: unknown, request: Request): ApiErrorResponse {
    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    return {
      success: false,
      statusCode,
      message: 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR',
      requestId: request.requestId ?? '',
      details: process.env.NODE_ENV === 'production'
        ? null
        : exception instanceof Error
          ? { name: exception.name, message: exception.message }
          : exception,
    };
  }

  private parseExceptionResponse(
    exceptionResponse: string | object,
    statusCode: number,
  ): Pick<ApiErrorResponse, 'message' | 'error' | 'details'> {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: this.resolveErrorCode(statusCode),
        details: null,
      };
    }

    const response = exceptionResponse as Record<string, unknown>;
    const message = this.resolveMessage(response.message, statusCode);
    const error = this.resolveError(response.error, statusCode);
    const details = this.resolveDetails(response);

    return { message, error, details };
  }

  private resolveMessage(message: unknown, statusCode: number): string {
    if (typeof message === 'string') {
      return message;
    }

    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message[0] ?? this.getDefaultErrorMessage(statusCode);
    }

    return this.getDefaultErrorMessage(statusCode);
  }

  private resolveError(error: unknown, statusCode: number): string {
    if (typeof error === 'string' && error.trim().length > 0) {
      return this.toErrorCode(error);
    }

    return this.resolveErrorCode(statusCode);
  }

  private resolveDetails(response: Record<string, unknown>): unknown {
    if (Array.isArray(response.message)) {
      return this.formatValidationDetails(response.message);
    }

    if ('details' in response) {
      return response.details ?? null;
    }

    if ('errors' in response) {
      return response.errors ?? null;
    }

    const extraFields = Object.fromEntries(
      Object.entries(response).filter(
        ([key]) => !['statusCode', 'message', 'error'].includes(key),
      ),
    );

    return Object.keys(extraFields).length > 0 ? extraFields : null;
  }

  private formatValidationDetails(messages: unknown[]): ValidationDetail[] {
    return messages
      .filter((item): item is string => typeof item === 'string')
      .map((item) => {
        const separatorIndex = item.indexOf(' ');

        if (separatorIndex === -1) {
          return { field: 'unknown', message: item };
        }

        return {
          field: item.slice(0, separatorIndex),
          message: item.slice(separatorIndex + 1),
        };
      });
  }

  private resolveErrorCode(statusCode: number): string {
    const codes: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
      [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
      [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
      [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
      [HttpStatus.CONFLICT]: 'CONFLICT',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
      [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
    };

    return codes[statusCode] ?? 'HTTP_ERROR';
  }

  private toErrorCode(value: string): string {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private getDefaultErrorMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Resource not found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal server error',
    };

    return messages[statusCode] ?? 'Request failed';
  }
}
