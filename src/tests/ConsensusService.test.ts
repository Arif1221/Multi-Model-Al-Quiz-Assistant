import { describe, expect, it } from 'vitest';
import { ConsensusService } from '../features/consensus/ConsensusService';
import type { ModelAnswer } from '../types';

const answers = (values: Array<[string, string, number]>): ModelAnswer[] =>
  values.map(([model, answer, confidence]) => ({
    model,
    answer,
    confidence,
    explanation: `${model} selected ${answer}`
  }));

describe('ConsensusService', () => {
  it('returns very high confidence for full agreement', () => {
    const service = new ConsensusService();
    const consensus = service.calculateConsensus(
      answers([
        ['GPT', 'C', 0.93],
        ['Claude', 'C', 0.91],
        ['Gemini', 'C', 0.95]
      ])
    );

    expect(consensus.consensusAnswer).toBe('C');
    expect(consensus.agreementPercent).toBe(100);
    expect(consensus.averageConfidence).toBe(93);
    expect(consensus.confidenceLevel).toBe('Very High');
  });

  it('returns high confidence when two of three models agree', () => {
    const service = new ConsensusService();
    const consensus = service.calculateConsensus(
      answers([
        ['GPT', 'A', 0.6],
        ['Claude', 'B', 0.75],
        ['Gemini', 'B', 0.8]
      ])
    );

    expect(consensus.consensusAnswer).toBe('B');
    expect(consensus.agreementPercent).toBe(67);
    expect(consensus.confidenceLevel).toBe('High');
  });
});
