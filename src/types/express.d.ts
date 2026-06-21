import { IJwtPayload } from "@common";

declare module "express-serve-static-core" {
  interface Request {
    user?: IJwtPayload,
    requestId?: string,
  }
}