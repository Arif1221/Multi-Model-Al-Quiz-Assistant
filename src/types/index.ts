export type OptionLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | string;

export interface QuizOption {
  id: string;
  label: OptionLabel;
  text: string;
  isSelected?: boolean;
  inputType?: 'radio' | 'checkbox' | 'text' | 'unknown';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  source: 'dom' | 'text' | 'form' | 'manual';
  confidence: number;
  contextSnippet?: string;
}

export interface PageContext {
  url: string;
  title: string;
  headings: string[];
  visibleText: string;
  mainContent: string;
  extractedAt: string;
}

export type ModelProvider = 'gpt' | 'claude' | 'gemini';

export interface StudyModel {
  id: string;
  label: string;
  provider: ModelProvider;
  enabled: boolean;
}

export interface ModelAnswer {
  model: string;
  answer: string;
  confidence: number;
  explanation: string;
  rawText?: string;
  latencyMs?: number;
}

export interface ConsensusOutput {
  consensusAnswer: string;
  agreementPercent: number;
  averageConfidence: number;
  confidenceLevel: 'Very High' | 'High' | 'Medium' | 'Low';
  reasoning: string;
  answerCounts: Record<string, number>;
}

export interface ReliabilityOutput {
  reliability: 'Reliable' | 'Verify' | 'Uncertain';
  color: 'green' | 'yellow' | 'red';
  score: number;
  warningMessages: string[];
}

export interface StudyTools {
  notes: string[];
  flashcards: Array<{ front: string; back: string }>;
  revisionPoints: string[];
  practiceQuestions: QuizQuestion[];
}

export interface AnswerHistoryItem {
  id: string;
  page: Pick<PageContext, 'url' | 'title'>;
  question: QuizQuestion;
  modelAnswers: ModelAnswer[];
  consensus: ConsensusOutput;
  reliability: ReliabilityOutput;
  createdAt: string;
}

export interface ExtensionSettings {
  apiKey: string;
  models: StudyModel[];
  theme: 'light' | 'dark' | 'system';
}

export type RuntimeMessage =
  | { type: 'STUDYPILOT_EXTRACT_PAGE' }
  | { type: 'STUDYPILOT_PAGE_UPDATED'; payload: { pageContext: PageContext; questions: QuizQuestion[] } };
