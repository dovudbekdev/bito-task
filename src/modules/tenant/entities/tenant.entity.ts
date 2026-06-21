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
import { User } from '../../user/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from '../../order/entities/order.entity';

@Entity('tenants')
export class Tenant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ name: 'user_id' })
    userId: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.tenants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => User, (user) => user.tenant)
    cashiers: User[];

    // Relations
    @OneToMany(() => Product, (product) => product.tenant)
    products: Product[];

    @OneToMany(() => Order, (order) => order.tenant)
    orders: Order[];
}
