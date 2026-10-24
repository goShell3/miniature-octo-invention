import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaymentStatus } from '@amalink/types';

export class UpdateOrderStatusDto {
  @IsOptional()
  @IsIn(['pending', 'printing', 'shipped', 'delivered'])
  status?: 'pending' | 'printing' | 'shipped' | 'delivered';

  @IsOptional()
  @IsIn(['unpaid', 'verifying', 'paid', 'failed'])
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsString()
  adminNote?: string;
}
