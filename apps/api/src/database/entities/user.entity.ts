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

  @Column({ type: 'varchar', length: 32, default: 'user' })
  role!: 'admin' | 'user';

  @Column({ name: 'customer_type', type: 'varchar', length: 32, default: 'individual' })
  customerType!: NfcCardTier;

  @Column({ name: 'company_name', type: 'varchar', length: 150, nullable: true })
  companyName!: string | null;

  @Column({ name: 'company_logo_url', type: 'text', nullable: true })
  companyLogoUrl!: string | null;

  @Column({ name: 'brand_color', type: 'varchar', length: 16, nullable: true })
  brandColor!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 50, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'tin_number', type: 'varchar', length: 50, nullable: true })
  tinNumber!: string | null;

  @Column({ name: 'team_size', type: 'varchar', length: 50, nullable: true })
  teamSize!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PortfolioEntity, (portfolio) => portfolio.owner)
  portfolios!: PortfolioEntity[];
}
