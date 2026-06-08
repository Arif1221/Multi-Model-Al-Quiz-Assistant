import { describe, expect, it } from 'vitest';
import { normalizeWhitespace, stableId, uniqueStrings } from '../utils/text';

describe('text utilities', () => {
  it('normalizes whitespace', () => {
    expect(normalizeWhitespace('  one\n\n two\tthree  ')).toBe('one two three');
  });

  it('deduplicates strings case-insensitively after normalization', () => {
    expect(uniqueStrings([' A ', 'a', 'B'])).toEqual([' A ', 'B']);
  });

  it('creates deterministic ids', () => {
    expect(stableId('q', 'question', 0)).toBe(stableId('q', 'question', 0));
  });
});
