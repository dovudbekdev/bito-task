import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from '../interfaces';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): IJwtPayload => {
    const request = context.switchToHttp().getRequest<{ user: IJwtPayload }>();
    return request.user;
  },
);
