import { OrderStatus } from "@common";
import { User } from "../../user/entities/user.entity";
import { Tenant } from "../../tenant/entities/tenant.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderItem } from "./order-item.entity";

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
    status: OrderStatus;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;

    @Column({ type: 'int' })
    totalQuantity: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    paidAt: Date | null;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.orders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cashier_id' })
    cashier: User;

    @OneToMany(() => OrderItem, (item) => item.order)
    items: OrderItem[];
}
