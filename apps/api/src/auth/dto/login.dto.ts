import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@flavohub.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'ChangeMe@12345' })
  @IsString()
  @MinLength(8)
  password!: string;
}
