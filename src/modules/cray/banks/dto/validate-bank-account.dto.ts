import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class ValidateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Nigerian bank account number must be exactly 10 digits' })
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}
