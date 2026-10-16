import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CardTapEntity } from './card-tap.entity';
import { PortfolioEntity } from './portfolio.entity';
import { NfcCardTier } from '@amalink/types';

@Entity({ name: 'nfc_orders' })
export class NfcOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PortfolioEntity, { nullable: false, onDelete: 'CASCADE' })
  portfolio!: PortfolioEntity;

  @Column({ name: 'short_link_code', type: 'varchar', unique: true })
  shortLinkCode!: string;

  @Column({ type: 'varchar', default: 'pending' })
  status!: 'pending' | 'printing' | 'shipped' | 'delivered';

  @Column({ type: 'varchar', default: 'individual' })
  tier!: NfcCardTier;

  @Column({ type: 'integer', default: 1 })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'integer', default: 2999 })
  unitPrice!: number;

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress!: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    region: string;
    postalCode?: string;
    countryCode: string;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => CardTapEntity, (tap) => tap.order)
  taps!: CardTapEntity[];
}
