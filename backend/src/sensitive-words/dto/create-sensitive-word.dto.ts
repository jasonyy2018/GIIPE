import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateSensitiveWordDto {
  @IsString()
  @IsNotEmpty()
  word: string;

  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @IsOptional()
  @IsString()
  category?: string = 'general';
}