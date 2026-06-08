import type { StudyModel } from '../../types';

export const DEFAULT_MODELS: StudyModel[] = [
  {
    id: 'openai/gpt-5',
    label: 'GPT',
    provider: 'gpt',
    enabled: true
  },
  {
    id: 'anthropic/claude-sonnet-4',
    label: 'Claude',
    provider: 'claude',
    enabled: true
  },
  {
    id: 'google/gemini-2.5-pro',
    label: 'Gemini',
    provider: 'gemini',
    enabled: true
  }
];

export const getEnabledModels = (models: StudyModel[]) => models.filter((model) => model.enabled);
