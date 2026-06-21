import { NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || randomUUID();

    req.requestId = String(requestId);
    res.setHeader('x-request-id', requestId);

    next();
  }
}
