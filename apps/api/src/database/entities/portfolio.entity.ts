import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortfolioTheme } from '@amalink/types';
import { PortfolioContentEntity } from './portfolio-content.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'portfolios' })
export class PortfolioEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, (user) => user.portfolios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  owner!: UserEntity;

  @Column({ type: 'varchar', unique: true })
  subdomain!: string;

  @Column({
    name: 'custom_domain',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  customDomain!: string | null;

  @Column({ type: 'varchar', default: 'draft' })
  status!: 'draft' | 'published' | 'unpublished';

  @Column({ type: 'jsonb', nullable: true })
  theme!: PortfolioTheme | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PortfolioContentEntity, (content) => content.portfolio)
  contentVersions!: PortfolioContentEntity[];
}
