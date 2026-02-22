import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class SyncFavoritesDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  slugs: string[];
}

export class AddFavoriteDto {
  @IsString()
  slug: string;
}
