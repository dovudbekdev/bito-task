import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const started = Date.now();
    const requestId = req.requestId;
    const method = req.method;
    const path = req.originalUrl || req.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          this.logger.log(
            `[${requestId}] ${method} ${path} -> ${res.statusCode} (${ms}ms)`,
          );
        },
        error: (err) => {
          const ms = Date.now() - started;

          const status = err instanceof HttpException ? err.getStatus() : 500;

          // odatda warn ham yetadi, error esa 5xx uchun
          const line = `[${requestId}] ${method} ${path} -> ${status} (${ms}ms)`;

          if (status >= 500) this.logger.error(line, err?.stack);
          else this.logger.warn(line);
        },
      }),
    );
  }
}
