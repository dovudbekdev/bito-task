import { UserRole } from '../enums';

export interface IJwtPayload {
  userId: number;
  login: string;
  role: UserRole;
}
