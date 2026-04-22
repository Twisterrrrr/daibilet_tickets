import { BadRequestException } from '@nestjs/common';
import { TagKind, StructuralTagGroup } from '@/prisma-client';
import { describe, expect, it } from 'vitest';

import { EventTagRulesService } from '../event-tag-rules.service';

describe('EventTagRulesService', () => {
  const rules = new EventTagRulesService();

  describe('assertStructuralTagLimits', () => {
    it('accepts one tag per group', () => {
      rules.assertStructuralTagLimits([
        { id: '1', tagKind: TagKind.STRUCTURAL, structuralGroup: 'THEME' as StructuralTagGroup },
        { id: '2', tagKind: TagKind.STRUCTURAL, structuralGroup: 'AUDIENCE' as StructuralTagGroup },
        { id: '3', tagKind: TagKind.STRUCTURAL, structuralGroup: 'FORMAT' as StructuralTagGroup },
      ]);
    });

    it('throws when more than 1 tag in same group', () => {
      expect(() =>
        rules.assertStructuralTagLimits([
          { id: '1', tagKind: TagKind.STRUCTURAL, structuralGroup: 'THEME' as StructuralTagGroup },
          { id: '2', tagKind: TagKind.STRUCTURAL, structuralGroup: 'THEME' as StructuralTagGroup },
        ]),
      ).toThrow(BadRequestException);
    });

    it('throws when structuralGroup is null', () => {
      expect(() =>
        rules.assertStructuralTagLimits([{ id: '1', tagKind: TagKind.STRUCTURAL, structuralGroup: null }]),
      ).toThrow(BadRequestException);
    });

    it('throws when tagKind is not STRUCTURAL', () => {
      expect(() =>
        rules.assertStructuralTagLimits([{ id: '1', tagKind: TagKind.POPULAR, structuralGroup: 'THEME' as StructuralTagGroup }]),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertPopularTagWhitelist', () => {
    it('accepts POPULAR with structuralGroup null', () => {
      rules.assertPopularTagWhitelist([{ id: '1', tagKind: TagKind.POPULAR, structuralGroup: null }]);
    });

    it('throws when tagKind is not POPULAR', () => {
      expect(() =>
        rules.assertPopularTagWhitelist([{ id: '1', tagKind: TagKind.STRUCTURAL, structuralGroup: null }]),
      ).toThrow(BadRequestException);
    });

    it('throws when structuralGroup is set for popular', () => {
      expect(() =>
        rules.assertPopularTagWhitelist([{ id: '1', tagKind: TagKind.POPULAR, structuralGroup: 'THEME' as StructuralTagGroup }]),
      ).toThrow(BadRequestException);
    });
  });
});

