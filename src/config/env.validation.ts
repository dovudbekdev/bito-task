import { NODE_ENV } from "@common";
import Joi from "joi";

export const envValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid(NODE_ENV.DEVELOPMENT, NODE_ENV.PRODUCTION)
        .default(NODE_ENV.DEVELOPMENT),

    // APP
    APP_NAME: Joi.string().default('BITO-TASK'),
    APP_HOST: Joi.string().default('localhost'),
    APP_PREFIX: Joi.string().default('api/'),
    APP_PORT: Joi.number().integer().min(1).max(65535).default(3000),
    APP_URL: Joi.string().uri().default('http://localhost:3000/'),

    // DATABASE
    DB_URL: Joi.string().required(),
    DB_SSL: Joi.boolean().truthy('true').falsy('false').default(false),

    // SUPER ADMIN
    SUPER_ADMIN_LOGIN: Joi.string().required(),
    SUPER_ADMIN_PASSWORD: Joi.string().required(),

    // JWT
    JWT_ACCESS_SECRET: Joi.string().min(20).required(),
    JWT_ACCESS_EXPIRES_IN: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().min(20).required(),
    JWT_REFRESH_EXPIRES_IN: Joi.string().required(),
})