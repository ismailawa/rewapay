import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export class TransferDestinationDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Nigerian bank account numbers must be 10 digits' })
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;
}

export class InitiateTransferDto {
  @IsString()
  @IsNotEmpty()
  walletId: string;

  @IsString()
  @IsNotEmpty()
  amount: string; // NGN decimal string, e.g. "100.00"

  @IsString()
  @IsNotEmpty()
  @Length(1, 64, { message: 'Reference must be between 1 and 64 characters' })
  reference: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TransferDestinationDto)
  destination: TransferDestinationDto;

  @IsString()
  @IsOptional()
  narration?: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}

