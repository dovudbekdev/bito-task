import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '@common';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    login: string;

    @Column({ type: 'text', select: false })
    password: string;

    @Column({ type: 'enum', enum: UserRole })
    role: UserRole;

    @Column({ name: 'tenant_id', nullable: true })
    tenantId: number | null;

    @Column({ type: 'text', nullable: true, select: false })
    refreshToken: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;


    // Relations
    @OneToMany(() => Tenant, (tenant) => tenant.user)
    tenants: Tenant[];

    @ManyToOne(() => Tenant, (tenant) => tenant.cashiers, {
        nullable: true,
        onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;

    @OneToMany(() => Order, (order) => order.cashier)
    orders: Order[];
}
