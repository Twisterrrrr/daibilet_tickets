import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

interface DedupCandidate {
  eventA: { id: string; title: string; slug: string; cityId: string; address?: string | null; venueId?: string | null };
  eventB: { id: string; title: string; slug: string; cityId: string; address?: string | null; venueId?: string | null };
  similarity: number;
  reason: string;
}

@Injectable()
export class FuzzyDedupService {
  private readonly logger = new Logger(FuzzyDedupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Нормализация названия: убираем скобки (18+), (NEW), кавычки, лишние пробелы, приводим к lowercase
   */
  private normalize(title: string): string {
    return title
      .replace(/\([^)]*\)/g, '') // Remove parenthesized content like (18+), (NEW)
      .replace(/[«»""'']/g, '') // Remove quotes
      .replace(/[—–-]/g, ' ') // Replace dashes with spaces
      .toLowerCase()
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();
  }

  /**
   * Levenshtein distance
   */
  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      }
    }
    return matrix[a.length][b.length];
  }

  /**
   * Check if two events are similar enough to be duplicates
   */
  private isSimilar(
    a: { title: string; address?: string | null; venueId?: string | null },
    b: { title: string; address?: string | null; venueId?: string | null },
  ): { similar: boolean; reason: string; score: number } {
    const normA = this.normalize(a.title);
    const normB = this.normalize(b.title);

    // Exact match after normalization
    if (normA === normB) {
      return { similar: true, reason: 'exact-normalized', score: 1.0 };
    }

    // One contains the other
    if (normA.includes(normB) || normB.includes(normA)) {
      return { similar: true, reason: 'substring', score: 0.9 };
    }

    // Levenshtein distance <= 3
    const dist = this.levenshtein(normA, normB);
    if (dist <= 3) {
      return { similar: true, reason: `levenshtein(${dist})`, score: 1 - dist / Math.max(normA.length, normB.length) };
    }

    // Address or venue match as additional signal
    if (a.venueId && b.venueId && a.venueId === b.venueId) {
      // Same venue, check relaxed Levenshtein
      if (dist <= 8) {
        return { similar: true, reason: `same-venue+levenshtein(${dist})`, score: 0.7 };
      }
    }
    if (a.address && b.address && a.address === b.address) {
      if (dist <= 8) {
        return { similar: true, reason: `same-address+levenshtein(${dist})`, score: 0.7 };
      }
    }

    return { similar: false, reason: '', score: 0 };
  }

  /**
   * Find fuzzy duplicate candidates
   * @param dryRun - if true, only return candidates without applying merge
   */
  async findDuplicates(dryRun = true): Promise<{ candidates: DedupCandidate[]; merged: number }> {
    this.logger.log(`Starting fuzzy dedup (dryRun=${dryRun})...`);

    // Load all active events grouped by city
    const events = await this.prisma.event.findMany({
      where: { isActive: true },
      select: {
        id: true,
        title: true,
        slug: true,
        cityId: true,
        address: true,
        venueId: true,
        source: true,
        rating: true,
        reviewCount: true,
        sessions: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
      orderBy: { title: 'asc' },
    });

    // Group by city
    const byCity = new Map<string, typeof events>();
    for (const event of events) {
      const group = byCity.get(event.cityId) || [];
      group.push(event);
      byCity.set(event.cityId, group);
    }

    const candidates: DedupCandidate[] = [];

    // Compare within each city
    for (const [, cityEvents] of byCity) {
      for (let i = 0; i < cityEvents.length; i++) {
        for (let j = i + 1; j < cityEvents.length; j++) {
          const a = cityEvents[i];
          const b = cityEvents[j];

          const { similar, reason, score } = this.isSimilar(a, b);
          if (similar) {
            candidates.push({
              eventA: {
                id: a.id,
                title: a.title,
                slug: a.slug,
                cityId: a.cityId,
                address: a.address,
                venueId: a.venueId,
              },
              eventB: {
                id: b.id,
                title: b.title,
                slug: b.slug,
                cityId: b.cityId,
                address: b.address,
                venueId: b.venueId,
              },
              similarity: score,
              reason,
            });
          }
        }
      }
    }

    candidates.sort((a, b) => b.similarity - a.similarity);

    let merged = 0;
    if (!dryRun && candidates.length > 0) {
      merged = await this.mergeDuplicates(candidates);
    }

    this.logger.log(`Fuzzy dedup complete: ${candidates.length} candidates found, ${merged} merged`);
    return { candidates, merged };
  }

  /**
   * Merge duplicates: keep the one with better rating/reviewCount, deactivate the other
   */
  private async mergeDuplicates(candidates: DedupCandidate[]): Promise<number> {
    const deactivated = new Set<string>();
    let count = 0;

    for (const candidate of candidates) {
      if (deactivated.has(candidate.eventA.id) || deactivated.has(candidate.eventB.id)) continue;

      // Keep the one with higher rating, then higher reviewCount
      const eventA = await this.prisma.event.findUnique({
        where: { id: candidate.eventA.id },
        select: { rating: true, reviewCount: true },
      });
      const eventB = await this.prisma.event.findUnique({
        where: { id: candidate.eventB.id },
        select: { rating: true, reviewCount: true },
      });

      if (!eventA || !eventB) continue;

      const keepA =
        (eventA.rating ?? 0) > (eventB.rating ?? 0) ||
        ((eventA.rating ?? 0) === (eventB.rating ?? 0) && (eventA.reviewCount ?? 0) >= (eventB.reviewCount ?? 0));

      const [keepId, removeId] = keepA
        ? [candidate.eventA.id, candidate.eventB.id]
        : [candidate.eventB.id, candidate.eventA.id];

      await this.prisma.event.update({
        where: { id: removeId },
        data: { isActive: false },
      });

      deactivated.add(removeId);
      count++;
      this.logger.log(`Merged: kept ${keepId}, deactivated ${removeId} (${candidate.reason})`);
    }

    return count;
  }
}
