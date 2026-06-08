import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnswerHistoryItem,
  ExtensionSettings,
  ModelAnswer,
  PageContext,
  QuizQuestion,
  ReliabilityOutput,
  ConsensusOutput
} from '../types';
import { DEFAULT_MODELS } from '../services/models/modelCatalog';

interface AnalysisState {
  pageContext: PageContext | null;
  questions: QuizQuestion[];
  selectedQuestionId: string | null;
  modelAnswers: ModelAnswer[];
  consensus: ConsensusOutput | null;
  reliability: ReliabilityOutput | null;
  history: AnswerHistoryItem[];
  settings: ExtensionSettings;
  isAnalyzing: boolean;
  error: string | null;
  setPageData: (pageContext: PageContext, questions: QuizQuestion[]) => void;
  selectQuestion: (questionId: string) => void;
  setAnalysis: (payload: {
    modelAnswers: ModelAnswer[];
    consensus: ConsensusOutput;
    reliability: ReliabilityOutput;
  }) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  updateSettings: (settings: Partial<ExtensionSettings>) => void;
  clearHistory: () => void;
}

export const useAppStore = create<AnalysisState>()(
  persist(
    (set, get) => ({
      pageContext: null,
      questions: [],
      selectedQuestionId: null,
      modelAnswers: [],
      consensus: null,
      reliability: null,
      history: [],
      settings: {
        apiKey: '',
        models: DEFAULT_MODELS,
        theme: 'system'
      },
      isAnalyzing: false,
      error: null,
      setPageData: (pageContext, questions) =>
        set((state) => ({
          pageContext,
          questions,
          selectedQuestionId: state.selectedQuestionId ?? questions[0]?.id ?? null
        })),
      selectQuestion: (selectedQuestionId) =>
        set({
          selectedQuestionId,
          modelAnswers: [],
          consensus: null,
          reliability: null
        }),
      setAnalysis: ({ modelAnswers, consensus, reliability }) => {
        const state = get();
        const selected = state.questions.find((question) => question.id === state.selectedQuestionId);
        const historyItem =
          selected && state.pageContext
            ? {
                id: crypto.randomUUID(),
                page: {
                  title: state.pageContext.title,
                  url: state.pageContext.url
                },
                question: selected,
                modelAnswers,
                consensus,
                reliability,
                createdAt: new Date().toISOString()
              }
            : null;

        set((current) => ({
          modelAnswers,
          consensus,
          reliability,
          history: historyItem ? [historyItem, ...current.history].slice(0, 50) : current.history
        }));
      },
      setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      setError: (error) => set({ error }),
      updateSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings
          }
        })),
      clearHistory: () => set({ history: [] })
    }),
    {
      name: 'studypilot-ai-store',
      partialize: (state) => ({
        history: state.history,
        settings: state.settings
      })
    }
  )
);
