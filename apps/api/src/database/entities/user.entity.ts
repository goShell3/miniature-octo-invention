import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NfcCardTier } from '@amalink/types';
import { PortfolioEntity } from './portfolio.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'text', nullable: true })
  image!: string | null;

  @Column({ name: 'customer_type', type: 'varchar', length: 32, default: 'individual' })
  customerType!: NfcCardTier;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PortfolioEntity, (portfolio) => portfolio.owner)
  portfolios!: PortfolioEntity[];
}
