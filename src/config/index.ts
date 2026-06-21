import { adminConfig, AdminConfigType } from "./admin.config";
import { appConfig, AppConfigType } from "./app.config";
import { dbConfig, DbConfigType } from "./db.config";
import { jwtConfig, JwtConfigType } from "./jwt.config";

export const configs = [
    appConfig,
    adminConfig,
    dbConfig,
    jwtConfig,
]

export type AllConfigType = {
    app: AppConfigType,
    admin: AdminConfigType,
    db: DbConfigType,
    jwt: JwtConfigType,
}

export * from './admin.config'
export * from './app.config'
export * from './db.config'
export * from './jwt.config'
export * from './env.validation'
export * from './swagger.config'