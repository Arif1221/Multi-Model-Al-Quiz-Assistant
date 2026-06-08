import { describe, expect, it } from 'vitest';
import { ReliabilityService } from '../features/consensus/ReliabilityService';
import type { ConsensusOutput } from '../types';

const consensus = (agreementPercent: number, averageConfidence: number): ConsensusOutput => ({
  consensusAnswer: 'C',
  agreementPercent,
  averageConfidence,
  confidenceLevel: 'High',
  reasoning: 'Test reasoning',
  answerCounts: { C: 2 }
});

describe('ReliabilityService', () => {
  it('marks high agreement as reliable', () => {
    const result = new ReliabilityService().calculateReliability(consensus(100, 93));
    expect(result.reliability).toBe('Reliable');
    expect(result.color).toBe('green');
  });

  it('marks partial agreement as verify', () => {
    const result = new ReliabilityService().calculateReliability(consensus(67, 74));
    expect(result.reliability).toBe('Verify');
    expect(result.color).toBe('yellow');
  });

  it('marks low agreement as uncertain', () => {
    const result = new ReliabilityService().calculateReliability(consensus(33, 51));
    expect(result.reliability).toBe('Uncertain');
    expect(result.color).toBe('red');
  });
});
