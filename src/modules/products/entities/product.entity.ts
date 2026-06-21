import { Tenant } from "../../tenant/entities/tenant.entity";
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";

@Entity("products")
export class Product {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string| null;

    @Column({ type: 'int' ,default: 0 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    costPrice: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    unitPrice: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    // Relations
    @ManyToOne(() => Tenant, (tenant) => tenant.products, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tenant_id' })
    tenant: Tenant;
}
