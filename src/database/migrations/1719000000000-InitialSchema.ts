import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1719000000000 implements MigrationInterface {
  name = 'InitialSchema1719000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'admin', 'cashier')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."orders_status_enum" AS ENUM('pending_payment', 'paid', 'cancelled')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "login" character varying(255) NOT NULL,
        "password" text NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "tenant_id" integer,
        "refreshToken" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_login" UNIQUE ("login"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "user_id" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenants_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_tenant_id"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "quantity" integer NOT NULL DEFAULT 0,
        "costPrice" numeric(10,2) NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "tenant_id" integer NOT NULL,
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_products_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id" SERIAL NOT NULL,
        "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending_payment',
        "totalAmount" numeric(10,2) NOT NULL,
        "totalQuantity" integer NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "paidAt" TIMESTAMP WITH TIME ZONE,
        "tenant_id" integer NOT NULL,
        "cashier_id" integer NOT NULL,
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_tenant_id" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_cashier_id" FOREIGN KEY ("cashier_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id" SERIAL NOT NULL,
        "productName" character varying(255) NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        "costPrice" numeric(10,2) NOT NULL,
        "lineTotal" numeric(10,2) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "order_id" integer NOT NULL,
        "product_id" integer NOT NULL,
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_items_order_id" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_product_id" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "eventId" character varying(255) NOT NULL,
        "order_id" integer NOT NULL,
        "tenant_id" integer NOT NULL,
        "provider" character varying(255),
        "payload" jsonb NOT NULL,
        "processedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_payment_events_eventId" ON "payment_events" ("eventId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_events_eventId"`);
    await queryRunner.query(`DROP TABLE "payment_events"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_tenant_id"`);
    await queryRunner.query(`DROP TABLE "tenants"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
