import {
  CreateDateColumn,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { PortfolioBlock } from '@amalink/types';
import { PortfolioEntity } from './portfolio.entity';

@Entity({ name: 'portfolio_content' })
@Unique(['portfolio', 'version'])
export class PortfolioContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PortfolioEntity, (portfolio) => portfolio.contentVersions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  portfolio!: PortfolioEntity;

  @Column({ type: 'integer' })
  version!: number;

  @Column({ type: 'jsonb' })
  blocks!: PortfolioBlock[];

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
