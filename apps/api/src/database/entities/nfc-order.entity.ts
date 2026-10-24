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
import { NfcCardTier, PaymentMethod, PaymentStatus } from '@amalink/types';

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

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod!: PaymentMethod | null;

  @Column({ name: 'payment_status', type: 'varchar', default: 'unpaid' })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference!: string | null;

  @Column({ name: 'cheki_url', type: 'text', nullable: true })
  chekiUrl!: string | null;

  @Column({ name: 'payment_verified_at', type: 'timestamptz', nullable: true })
  paymentVerifiedAt!: Date | null;

  @Column({ name: 'payment_verification_data', type: 'jsonb', nullable: true })
  paymentVerificationData!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => CardTapEntity, (tap) => tap.order)
  taps!: CardTapEntity[];
}
