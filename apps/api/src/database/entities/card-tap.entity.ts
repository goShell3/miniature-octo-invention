import {
  CreateDateColumn,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NfcOrderEntity } from './nfc-order.entity';

@Entity({ name: 'card_taps' })
export class CardTapEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => NfcOrderEntity, (order) => order.taps, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  order!: NfcOrderEntity;

  @CreateDateColumn({ name: 'tapped_at', type: 'timestamptz' })
  tappedAt!: Date;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'rough_geo', type: 'varchar', nullable: true })
  roughGeo!: string | null;
}
