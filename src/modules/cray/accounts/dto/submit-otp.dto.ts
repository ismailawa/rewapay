import { IsNotEmpty, IsString, Length } from 'class-validator';

export class SubmitVirtualAccountOtpDto {
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 10, { message: 'OTP must be between 4 and 10 digits' })
  otp: string;
}

