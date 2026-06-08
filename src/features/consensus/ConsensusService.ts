import type { ConsensusOutput, ModelAnswer } from '../../types';

export class ConsensusService {
  calculateConsensus(answers: ModelAnswer[]): ConsensusOutput {
    if (answers.length === 0) {
      return {
        consensusAnswer: 'No answer',
        agreementPercent: 0,
        averageConfidence: 0,
        confidenceLevel: 'Low',
        reasoning: 'No model responses were available.',
        answerCounts: {}
      };
    }

    const answerCounts = this.countAnswers(answers);
    const [consensusAnswer, consensusCount] = Object.entries(answerCounts).sort((a, b) => b[1] - a[1])[0];
    const agreementPercent = this.calculateAgreement(consensusCount, answers.length);
    const averageConfidence = this.calculateConfidence(answers);

    return {
      consensusAnswer,
      agreementPercent,
      averageConfidence,
      confidenceLevel: this.getConfidenceLevel(agreementPercent),
      reasoning: this.generateReasoning(consensusAnswer, consensusCount, answers.length),
      answerCounts
    };
  }

  calculateAgreement(consensusCount: number, totalCount: number) {
    if (totalCount === 0) return 0;
    return Math.round((consensusCount / totalCount) * 100);
  }

  calculateConfidence(answers: ModelAnswer[]) {
    if (answers.length === 0) return 0;
    const average = answers.reduce((sum, answer) => sum + answer.confidence, 0) / answers.length;
    return Math.round(Math.min(Math.max(average, 0), 1) * 100);
  }

  generateReasoning(consensusAnswer: string, consensusCount: number, totalCount: number) {
    if (consensusCount === totalCount) {
      return `All ${totalCount} models selected answer ${consensusAnswer}.`;
    }

    return `${consensusCount} of ${totalCount} models selected answer ${consensusAnswer}.`;
  }

  private countAnswers(answers: ModelAnswer[]) {
    return answers.reduce<Record<string, number>>((counts, answer) => {
      const normalized = this.normalizeAnswer(answer.answer);
      counts[normalized] = (counts[normalized] ?? 0) + 1;
      return counts;
    }, {});
  }

  private normalizeAnswer(answer: string) {
    const trimmed = answer.trim();
    const optionMatch = trimmed.match(/^([A-H])(?:[).:-]|\s|$)/i);
    return (optionMatch?.[1] ?? trimmed).toUpperCase();
  }

  private getConfidenceLevel(agreementPercent: number): ConsensusOutput['confidenceLevel'] {
    if (agreementPercent === 100) return 'Very High';
    if (agreementPercent >= 67) return 'High';
    if (agreementPercent >= 50) return 'Medium';
    return 'Low';
  }
}
