import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetFeedDto {
  /**
   * Cursor for pagination: fetch posts with ID less than this cursor (WHERE id < cursor)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number;

  /**
   * Alias for cursor: supports WHERE id < :last_id
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  last_id?: number;

  /**
   * Number of items to return (default 10, max 100)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /**
   * Optionally include user's own posts in the feed alongside followed users
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  include_self?: boolean = false;
}
