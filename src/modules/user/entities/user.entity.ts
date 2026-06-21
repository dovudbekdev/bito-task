import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { UserRole } from "../../../common/enums";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'varchar', length: 255 })
    login: string;

    @Column({ type: 'text' })
    password: string;

    @Column({ type: 'enum', enum: UserRole })
    role: UserRole;

    @Column({ type: 'text', nullable: true })
    refreshToken: string| null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
