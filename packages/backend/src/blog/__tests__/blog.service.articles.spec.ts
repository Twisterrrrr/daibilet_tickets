import { NotFoundException } from '@nestjs/common';
import { ArticleStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { BlogService } from '../blog.service';

describe('BlogService (articles public)', () => {
  it('getArticles: always queries only PUBLISHED', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);

    const prisma = {
      article: { findMany, count },
    } as any;

    const s = new BlogService(prisma);
    await s.getArticles({ city: 'spb', tag: 'museum', page: 2, limit: 5 });

    expect(findMany).toHaveBeenCalledTimes(1);
    const arg = findMany.mock.calls[0]![0] as { where: any; skip: number; take: number; orderBy: unknown };
    expect(arg.where.status).toBe(ArticleStatus.PUBLISHED);
    expect(arg.skip).toBe(5);
    expect(arg.take).toBe(5);
    expect(arg.orderBy).toEqual({ publishedAt: 'desc' });
  });

  it('getArticleBySlug: throws 404 for missing or non-published', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = { article: { findFirst } } as any;
    const s = new BlogService(prisma);

    await expect(s.getArticleBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledTimes(1);
    const arg = findFirst.mock.calls[0]![0] as { where: any };
    expect(arg.where).toEqual({ slug: 'missing', status: ArticleStatus.PUBLISHED });
  });
});

