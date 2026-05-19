import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';

export class UpdateSensitiveWordDto {
  @IsOptional()
  @IsString()
  word?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  level?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}