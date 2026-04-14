import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

/** SEO KV (canonical base URL задаётся в ENV, не здесь). */
export class SeoSettingsValueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  defaultTitleSuffix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultOgImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  twitterSite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  indexableDefault?: boolean;
}

export class PatchSeoSettingsDto {
  @ApiPropertyOptional({ type: SeoSettingsValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoSettingsValueDto)
  value?: SeoSettingsValueDto;
}

export class SystemSettingsValueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  maintenanceMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAdminDebugBanner?: boolean;
}

export class PatchSystemSettingsDto {
  @ApiPropertyOptional({ type: SystemSettingsValueDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemSettingsValueDto)
  value?: SystemSettingsValueDto;
}
