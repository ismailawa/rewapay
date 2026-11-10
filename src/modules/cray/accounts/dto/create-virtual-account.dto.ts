import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { CustomerType, VirtualAccountType } from '../../enums/cray.enums';

export class CreateVirtualAccountDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(11, 11, { message: 'BVN must be exactly 11 digits' })
  bvn: string;

  @IsString()
  @IsOptional()
  @Length(11, 11, { message: 'NIN must be exactly 11 digits' })
  nin?: string;

  @IsString()
  @IsOptional()
  walletId?: string;

  @IsEnum(VirtualAccountType)
  @IsOptional()
  accountType?: VirtualAccountType = VirtualAccountType.PERMANENT;

  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType = CustomerType.INDIVIDUAL;

  @IsString()
  @IsOptional()
  rcNumber?: string;
}

