import type { ConsensusOutput, ReliabilityOutput } from '../../types';

export class ReliabilityService {
  calculateReliability(consensus: ConsensusOutput): ReliabilityOutput {
    const score = Math.round(consensus.agreementPercent * 0.7 + consensus.averageConfidence * 0.3);

    if (consensus.agreementPercent >= 90) {
      return {
        reliability: 'Reliable',
        color: 'green',
        score,
        warningMessages: []
      };
    }

    if (consensus.agreementPercent >= 60) {
      return {
        reliability: 'Verify',
        color: 'yellow',
        score,
        warningMessages: ['Models mostly agree, but review the explanation before relying on the answer.']
      };
    }

    return {
      reliability: 'Uncertain',
      color: 'red',
      score,
      warningMessages: ['Model answers conflict. Verify with course material or a trusted source.']
    };
  }
}
