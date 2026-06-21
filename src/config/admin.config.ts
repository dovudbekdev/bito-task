import { registerAs } from "@nestjs/config";

export const adminConfig = registerAs('admin', () => ({
    superAdminLogin: process.env.SUPER_ADMIN_LOGIN,
    superAdminPassword: process.env.SUPER_ADMIN_PASSWORD,
}))


export type AdminConfigType = ReturnType<typeof adminConfig>;