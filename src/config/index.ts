import { adminConfig, AdminConfigType } from "./admin.config";
import { appConfig, AppConfigType } from "./app.config";
import { dbConfig, DbConfigType } from "./db.config";
import { jwtConfig, JwtConfigType } from "./jwt.config";
import { paymentConfig, PaymentConfigType } from "./payment.config";

export const configs = [
    appConfig,
    adminConfig,
    dbConfig,
    jwtConfig,
    paymentConfig,
]

export type AllConfigType = {
    app: AppConfigType,
    admin: AdminConfigType,
    db: DbConfigType,
    jwt: JwtConfigType,
    payment: PaymentConfigType,
}

export * from './admin.config'
export * from './app.config'
export * from './db.config'
export * from './jwt.config'
export * from './payment.config'
export * from './env.validation'
export * from './swagger.config'