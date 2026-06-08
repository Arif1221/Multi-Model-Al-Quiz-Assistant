import type { QuizQuestion, StudyTools } from '../../types';

export class StudyToolsService {
  generateFromQuestion(question: QuizQuestion, explanation = ''): StudyTools {
    const correctBack = explanation || `Review the reasoning for: ${question.question}`;

    return {
      notes: [`Question focus: ${question.question}`, ...question.options.map((o) => `${o.label}: ${o.text}`)],
      flashcards: [
        {
          front: question.question,
          back: correctBack
        }
      ],
      revisionPoints: [
        'Identify the command word in the question.',
        'Eliminate options that conflict with the core concept.',
        'Check whether two options are near-duplicates before choosing.'
      ],
      practiceQuestions: []
    };
  }
}
