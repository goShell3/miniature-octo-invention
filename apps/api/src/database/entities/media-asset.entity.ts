import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioEntity } from './portfolio.entity';

@Entity({ name: 'media_assets' })
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PortfolioEntity, { nullable: false, onDelete: 'CASCADE' })
  portfolio!: PortfolioEntity;

  @Column({ type: 'text' })
  objectKey!: string;

  @Column({ type: 'text' })
  contentType!: string;

  @Column({ type: 'varchar', default: 'image' })
  type!: 'image' | 'resume' | 'other';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
