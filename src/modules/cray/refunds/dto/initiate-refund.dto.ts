import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateRefundDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsString()
  @IsOptional()
  amount?: string;
}
