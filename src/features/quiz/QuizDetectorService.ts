import type { QuizOption, QuizQuestion } from '../../types';
import { normalizeWhitespace, stableId } from '../../utils/text';

const OPTION_PATTERNS = [
  /^\s*([A-H])[).:-]\s+(.+)$/i,
  /^\s*([A-H])\s+(.+)$/i,
  /^\s*(\d{1,2})[).:-]\s+(.+)$/i,
  /^\s*(\d{1,2})\s+(.+)$/i
];

const QUESTION_HINT = /(\?|choose|select|which|what|when|where|who|why|how|true or false|capital|define)/i;
const MIN_QUESTION_LENGTH = 12;

interface TextQuestionDraft {
  question: string;
  options: QuizOption[];
  raw: string;
}

export class QuizDetectorService {
  detectFromDocument(documentRef: Document = document): QuizQuestion[] {
    const formQuestions = this.detectFormQuestions(documentRef);
    const textQuestions = this.detectFromText(documentRef.body?.innerText ?? '');
    return this.dedupeQuestions([...formQuestions, ...textQuestions]);
  }

  detectFromText(text: string): QuizQuestion[] {
    const lines = text
      .split(/\r?\n/)
      .map(normalizeWhitespace)
      .filter(Boolean);

    const drafts: TextQuestionDraft[] = [];
    let currentQuestion = '';
    let currentOptions: QuizOption[] = [];
    let rawLines: string[] = [];

    const flush = () => {
      if (this.looksLikeQuestion(currentQuestion) && currentOptions.length >= 2) {
        drafts.push({
          question: currentQuestion,
          options: currentOptions,
          raw: rawLines.join('\n')
        });
      }
      currentQuestion = '';
      currentOptions = [];
      rawLines = [];
    };

    for (const line of lines) {
      const option = this.parseOptionLine(line, currentOptions.length);

      if (option) {
        currentOptions.push(option);
        rawLines.push(line);
        continue;
      }

      if (currentOptions.length > 0) {
        flush();
      }

      if (this.looksLikeQuestion(line)) {
        currentQuestion = line.replace(/^\d+\.\s+/, '');
        rawLines = [line];
      } else if (currentQuestion && line.length < 180) {
        currentQuestion = normalizeWhitespace(`${currentQuestion} ${line}`);
        rawLines.push(line);
      }
    }

    flush();

    return drafts.map((draft, index) => ({
      id: stableId('q', draft.raw, index),
      question: draft.question,
      options: draft.options,
      source: 'text',
      confidence: this.scoreQuestion(draft.question, draft.options),
      contextSnippet: draft.raw
    }));
  }

  private detectFormQuestions(documentRef: Document): QuizQuestion[] {
    const inputs = Array.from(
      documentRef.querySelectorAll<HTMLInputElement>('input[type="radio"], input[type="checkbox"]')
    );
    const grouped = new Map<string, HTMLInputElement[]>();

    for (const input of inputs) {
      const key = input.name || input.getAttribute('aria-labelledby') || input.closest('fieldset')?.id;
      if (!key) continue;
      grouped.set(key, [...(grouped.get(key) ?? []), input]);
    }

    return Array.from(grouped.entries())
      .filter(([, group]) => group.length >= 2)
      .map(([key, group], index) => {
        const container = this.findQuestionContainer(group[0]);
        const question = this.extractQuestionText(container, group[0]);
        const options = group.map((input, optionIndex) => ({
          id: input.id || `${key}-${optionIndex}`,
          label: String.fromCharCode(65 + optionIndex),
          text: this.extractInputLabel(input),
          isSelected: input.checked,
          inputType: input.type as 'radio' | 'checkbox'
        }));

        return {
          id: stableId('q', `${question}-${key}`, index),
          question,
          options,
          source: 'form' as const,
          confidence: this.scoreQuestion(question, options),
          contextSnippet: normalizeWhitespace(container?.textContent ?? question)
        };
      })
      .filter((question) => this.looksLikeQuestion(question.question) && question.options.length >= 2);
  }

  private parseOptionLine(line: string, index: number): QuizOption | null {
    for (const pattern of OPTION_PATTERNS) {
      const match = line.match(pattern);
      if (match?.[1] && match[2]) {
        return {
          id: `option-${index + 1}`,
          label: match[1].toUpperCase(),
          text: normalizeWhitespace(match[2]),
          inputType: 'text'
        };
      }
    }

    return null;
  }

  private looksLikeQuestion(text: string) {
    const normalized = normalizeWhitespace(text);
    return normalized.length >= MIN_QUESTION_LENGTH && QUESTION_HINT.test(normalized);
  }

  private scoreQuestion(question: string, options: QuizOption[]) {
    let score = 0.45;
    if (question.includes('?')) score += 0.2;
    if (options.length >= 4) score += 0.2;
    if (options.every((option) => option.text.length >= 1)) score += 0.1;
    if (/radio|checkbox/i.test(options.map((option) => option.inputType).join(' '))) score += 0.05;
    return Math.min(Number(score.toFixed(2)), 0.98);
  }

  private findQuestionContainer(input: HTMLInputElement): HTMLElement | null {
    return (
      input.closest('[role="listitem"]') ??
      input.closest('fieldset') ??
      input.closest('form') ??
      input.closest('div')
    );
  }

  private extractQuestionText(container: HTMLElement | null, input: HTMLInputElement) {
    const legend = container?.querySelector('legend')?.textContent;
    const labelledBy = input.getAttribute('aria-labelledby');
    const ariaLabel = labelledBy ? document.getElementById(labelledBy)?.textContent : '';
    const heading = container?.querySelector('h1, h2, h3, h4, [role="heading"]')?.textContent;
    const text = normalizeWhitespace(legend ?? ariaLabel ?? heading ?? container?.textContent ?? '');
    const optionLabels = Array.from(container?.querySelectorAll('label') ?? []).map((label) =>
      normalizeWhitespace(label.textContent ?? '')
    );

    return optionLabels.reduce((questionText, option) => questionText.replace(option, ''), text).trim();
  }

  private extractInputLabel(input: HTMLInputElement) {
    const explicit = input.id ? document.querySelector(`label[for="${CSS.escape(input.id)}"]`) : null;
    const wrapping = input.closest('label');
    const ariaLabel = input.getAttribute('aria-label');
    const sibling = input.nextElementSibling?.textContent;

    return normalizeWhitespace(
      explicit?.textContent ?? wrapping?.textContent ?? ariaLabel ?? sibling ?? input.value ?? 'Option'
    );
  }

  private dedupeQuestions(questions: QuizQuestion[]) {
    const seen = new Set<string>();
    return questions
      .sort((a, b) => b.confidence - a.confidence)
      .filter((question) => {
        const key = normalizeWhitespace(question.question).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 30);
  }
}
