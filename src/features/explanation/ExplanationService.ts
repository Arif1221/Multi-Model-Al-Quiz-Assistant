import type { QuizQuestion } from '../../types';

export class ExplanationService {
  buildQuestionExplanationPrompt(question: QuizQuestion) {
    return [
      'Explain this question for a student.',
      'Include question explanation, concept explanation, beginner explanation, and exam shortcut.',
      `Question: ${question.question}`,
      `Options: ${question.options.map((option) => `${option.label}. ${option.text}`).join('; ')}`
    ].join('\n');
  }

  buildAnswerExplanationPrompt(question: QuizQuestion, answer: string) {
    return [
      'Explain the selected answer.',
      'Include why the correct option is correct, why other options are wrong, memory tricks, and related concepts.',
      `Question: ${question.question}`,
      `Selected answer: ${answer}`,
      `Options: ${question.options.map((option) => `${option.label}. ${option.text}`).join('; ')}`
    ].join('\n');
  }
}
