import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('payment_events')
export class PaymentEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255 })
    eventId: string;

    @Column({ name: 'order_id', type: 'int' })
    orderId: number;

    @Column({ name: 'tenant_id', type: 'int' })
    tenantId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    provider: string | null;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({ type: 'timestamp with time zone' })
    processedAt: Date;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updatedAt: Date;
}
