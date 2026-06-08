import { useCallback, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  History,
  Loader2,
  Moon,
  RefreshCw,
  Settings,
  Sparkles,
  Sun
} from 'lucide-react';
import { ConsensusService } from '../features/consensus/ConsensusService';
import { ReliabilityService } from '../features/consensus/ReliabilityService';
import { StudyToolsService } from '../features/flashcards/StudyToolsService';
import { OpenRouterService } from '../services/openrouter/OpenRouterService';
import { getEnabledModels } from '../services/models/modelCatalog';
import { useAppStore } from '../store/useAppStore';
import type { QuizQuestion, RuntimeMessage } from '../types';

const consensusService = new ConsensusService();
const reliabilityService = new ReliabilityService();
const studyToolsService = new StudyToolsService();

const isChromeRuntimeAvailable = () => typeof chrome !== 'undefined' && Boolean(chrome.tabs);

interface FrameExtraction {
  url: string;
  title: string;
  headings: string[];
  visibleText: string;
}

export function App() {
  const {
    pageContext,
    questions,
    selectedQuestionId,
    modelAnswers,
    consensus,
    reliability,
    history,
    settings,
    isAnalyzing,
    error,
    setPageData,
    selectQuestion,
    setAnalysis,
    setAnalyzing,
    setError,
    updateSettings,
    clearHistory
  } = useAppStore();

  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) ?? questions[0];
  const studyTools = selectedQuestion
    ? studyToolsService.generateFromQuestion(selectedQuestion, consensus?.reasoning)
    : null;

  const enabledModels = useMemo(() => getEnabledModels(settings.models), [settings.models]);

  const refreshPageData = useCallback(async () => {
    setError(null);

    if (!isChromeRuntimeAvailable()) {
      setPageData(
        {
          url: 'local-preview',
          title: 'Preview Page',
          headings: ['StudyPilot Preview'],
          visibleText:
            'What is the capital of France?\nA. London\nB. Berlin\nC. Paris\nD. Rome\nWhich gas do plants absorb during photosynthesis?\nA) Oxygen\nB) Carbon dioxide\nC) Nitrogen\nD) Hydrogen',
          mainContent:
            'What is the capital of France?\nA. London\nB. Berlin\nC. Paris\nD. Rome\nWhich gas do plants absorb during photosynthesis?\nA) Oxygen\nB) Carbon dioxide\nC) Nitrogen\nD) Hydrogen',
          extractedAt: new Date().toISOString()
        },
        [
          {
            id: 'preview-q1',
            question: 'What is the capital of France?',
            source: 'manual',
            confidence: 0.96,
            options: [
              { id: 'a', label: 'A', text: 'London' },
              { id: 'b', label: 'B', text: 'Berlin' },
              { id: 'c', label: 'C', text: 'Paris' },
              { id: 'd', label: 'D', text: 'Rome' }
            ]
          }
        ]
      );
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    try {
      const payload = await chrome.tabs.sendMessage(tab.id, { type: 'STUDYPILOT_EXTRACT_PAGE' });
      if (payload.questions.length > 0) {
        setPageData(payload.pageContext, payload.questions);
        return;
      }
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ['assets/content.js']
      });
    }

    const fallback = await collectAllFramePageData(tab.id);
    setPageData(fallback.pageContext, fallback.questions);
  }, [setError, setPageData]);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, [settings.theme]);

  useEffect(() => {
    void refreshPageData();

    if (!isChromeRuntimeAvailable()) return;

    const listener = (message: RuntimeMessage) => {
      if (message.type === 'STUDYPILOT_PAGE_UPDATED') {
        if (message.payload.questions.length > 0) {
          setPageData(message.payload.pageContext, message.payload.questions);
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshPageData, setPageData]);

  const analyzeSelectedQuestion = async () => {
    if (!selectedQuestion || !pageContext) return;
    if (!settings.apiKey.trim()) {
      setError('Add your OpenRouter API key in Settings before asking the models.');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const service = new OpenRouterService({ apiKey: settings.apiKey });
      const answers = await service.askMultipleModels(
        enabledModels,
        selectedQuestion,
        pageContext.mainContent || pageContext.visibleText
      );
      const nextConsensus = consensusService.calculateConsensus(answers);
      const nextReliability = reliabilityService.calculateReliability(nextConsensus);
      setAnalysis({
        modelAnswers: answers,
        consensus: nextConsensus,
        reliability: nextReliability
      });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <header className="section flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-normal">StudyPilot AI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pageContext?.title || 'Waiting for page context'}
          </p>
        </div>
        <button className="panel-button w-9 px-0" title="Refresh page scan" onClick={refreshPageData}>
          <RefreshCw size={16} />
        </button>
      </header>

      <main>
        {error ? (
          <div className="section flex gap-2 bg-rose-50 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-100">
            <AlertTriangle className="mt-0.5 shrink-0" size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="section">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold">Detected Questions</h2>
            </div>
            <span className="text-xs text-slate-500">{questions.length}</span>
          </div>

          <div className="space-y-2">
            {questions.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-3 text-sm text-slate-500 dark:border-slate-700">
                No quiz questions detected on this page yet.
              </p>
            ) : (
              questions.map((question) => (
                <button
                  key={question.id}
                  className={`w-full rounded-md border p-3 text-left transition ${
                    selectedQuestion?.id === question.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
                  }`}
                  onClick={() => selectQuestion(question.id)}
                >
                  <div className="text-sm font-medium">{question.question}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {question.options.map((option) => (
                      <span
                        key={option.id}
                        className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
                      >
                        {option.label}. {option.text}
                      </span>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="section">
          <button
            className="primary-button w-full"
            disabled={!selectedQuestion || isAnalyzing || enabledModels.length === 0}
            onClick={analyzeSelectedQuestion}
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            Ask GPT, Claude, and Gemini
          </button>
        </section>

        {reliability && consensus ? (
          <section className="section">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2
                size={18}
                className={
                  reliability.color === 'green'
                    ? 'text-emerald-600'
                    : reliability.color === 'yellow'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }
              />
              <h2 className="text-sm font-semibold">Reliability Meter</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Reliability" value={reliability.reliability} />
              <Metric label="Agreement" value={`${consensus.agreementPercent}%`} />
              <Metric label="Confidence" value={`${consensus.averageConfidence}%`} />
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className={`h-2 rounded-full ${
                  reliability.color === 'green'
                    ? 'bg-emerald-600'
                    : reliability.color === 'yellow'
                      ? 'bg-amber-500'
                      : 'bg-rose-600'
                }`}
                style={{ width: `${reliability.score}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{consensus.reasoning}</p>
          </section>
        ) : null}

        {modelAnswers.length > 0 ? (
          <section className="section">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold">Model Answers</h2>
            </div>
            <div className="space-y-2">
              {modelAnswers.map((answer) => (
                <div
                  key={answer.model}
                  className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{answer.model}</span>
                    <span className="text-sm font-bold">{answer.answer}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{answer.explanation}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {studyTools ? (
          <section className="section">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-teal-700" />
              <h2 className="text-sm font-semibold">Study Tools</h2>
            </div>
            <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {studyTools.revisionPoints.map((point) => (
                <p key={point} className="rounded-md bg-white p-2 dark:bg-slate-900">
                  {point}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        <SettingsPanel settings={settings} updateSettings={updateSettings} />

        <section className="section">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-slate-600" />
              <h2 className="text-sm font-semibold">History</h2>
            </div>
            <button className="text-xs text-slate-500 hover:text-slate-900" onClick={clearHistory}>
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-md bg-white p-2 text-sm dark:bg-slate-900">
                <div className="font-medium">{item.question.question}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.consensus.consensusAnswer} - {item.reliability.reliability}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

async function collectAllFramePageData(tabId: number) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: (): FrameExtraction => ({
      url: window.location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1, h2, h3'))
        .map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim() ?? '')
        .filter(Boolean)
        .slice(0, 20),
      visibleText: document.body?.innerText?.trim() ?? ''
    })
  });

  const frames = results.map((result) => result.result).filter(Boolean) as FrameExtraction[];
  const pageTitle = frames.find((frame) => frame.title)?.title ?? 'Current page';
  const pageUrl = frames.find((frame) => frame.url)?.url ?? '';
  const visibleText = frames.map((frame) => frame.visibleText).filter(Boolean).join('\n');
  const questions = detectFallbackQuestions(visibleText);

  return {
    pageContext: {
      url: pageUrl,
      title: pageTitle,
      headings: [...new Set(frames.flatMap((frame) => frame.headings))].slice(0, 20),
      visibleText,
      mainContent: visibleText,
      extractedAt: new Date().toISOString()
    },
    questions
  };
}

function detectFallbackQuestions(text: string): QuizQuestion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const questions: QuizQuestion[] = [];
  let question = '';
  let options: QuizQuestion['options'] = [];
  let raw: string[] = [];

  const flush = () => {
    if (question.length >= 12 && question.includes('?') && options.length >= 2) {
      questions.push({
        id: `frame-q-${questions.length + 1}`,
        question,
        options,
        source: 'text',
        confidence: options.length >= 4 ? 0.9 : 0.75,
        contextSnippet: raw.join('\n')
      });
    }
    question = '';
    options = [];
    raw = [];
  };

  for (const line of lines) {
    const optionMatch = line.match(/^\s*([A-H]|\d{1,2})(?:[).:-]|\s)\s*(.+)$/i);
    if (optionMatch && question) {
      options.push({
        id: `frame-q-${questions.length + 1}-option-${options.length + 1}`,
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim(),
        inputType: 'text'
      });
      raw.push(line);
      continue;
    }

    if (options.length > 0) flush();

    if (line.includes('?')) {
      question = line;
      raw = [line];
    } else if (question && line.length < 180) {
      question = `${question} ${line}`.replace(/\s+/g, ' ').trim();
      raw.push(line);
    }
  }

  flush();
  return questions.slice(0, 30);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SettingsPanel({
  settings,
  updateSettings
}: {
  settings: ReturnType<typeof useAppStore.getState>['settings'];
  updateSettings: ReturnType<typeof useAppStore.getState>['updateSettings'];
}) {
  return (
    <section className="section">
      <div className="mb-3 flex items-center gap-2">
        <Settings size={16} className="text-slate-600" />
        <h2 className="text-sm font-semibold">Settings</h2>
      </div>
      <label className="block text-xs font-medium text-slate-500">OpenRouter API Key</label>
      <input
        className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
        type="password"
        placeholder="sk-or-..."
        value={settings.apiKey}
        onChange={(event) => updateSettings({ apiKey: event.target.value })}
      />

      <div className="mt-3 grid grid-cols-3 gap-2">
        {settings.models.map((model) => (
          <label
            key={model.id}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-800 dark:bg-slate-900"
          >
            <input
              type="checkbox"
              checked={model.enabled}
              onChange={(event) =>
                updateSettings({
                  models: settings.models.map((item) =>
                    item.id === model.id ? { ...item, enabled: event.target.checked } : item
                  )
                })
              }
            />
            {model.label}
          </label>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          className="panel-button flex-1"
          onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        >
          {settings.theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          Theme
        </button>
      </div>
    </section>
  );
}
