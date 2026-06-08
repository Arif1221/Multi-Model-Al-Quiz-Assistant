import { z } from 'zod';
import type { ModelAnswer, QuizQuestion, StudyModel } from '../../types';

const OpenRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.string()
        })
        .optional(),
      delta: z
        .object({
          content: z.string().optional()
        })
        .optional()
    })
  )
});

const ModelAnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1).catch(0.5),
  explanation: z.string().catch('')
});

export interface OpenRouterServiceOptions {
  apiKey: string;
  appUrl?: string;
  appTitle?: string;
  minRequestGapMs?: number;
}

export class OpenRouterService {
  private lastRequestAt = 0;

  constructor(private readonly options: OpenRouterServiceOptions) {}

  async askModel(model: StudyModel, question: QuizQuestion, context: string): Promise<ModelAnswer> {
    const startedAt = Date.now();
    const prompt = this.buildAnswerPrompt(question, context);

    const responseText = await this.retryRequest(() =>
      this.complete({
        model: model.id,
        messages: [
          {
            role: 'system',
            content:
              'You are a careful study assistant. Return strict JSON with answer, confidence, and explanation.'
          },
          { role: 'user', content: prompt }
        ]
      })
    );

    const parsed = this.parseModelAnswer(responseText);
    return {
      model: model.label,
      answer: parsed.answer,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
      rawText: responseText,
      latencyMs: Date.now() - startedAt
    };
  }

  async askMultipleModels(
    models: StudyModel[],
    question: QuizQuestion,
    context: string
  ): Promise<ModelAnswer[]> {
    return Promise.all(models.map((model) => this.askModel(model, question, context)));
  }

  async streamResponse(
    model: StudyModel,
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal
  ) {
    await this.rateLimit();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: this.headers(),
      body: JSON.stringify({
        model: model.id,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenRouter stream failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
        const parsed = OpenRouterResponseSchema.safeParse(JSON.parse(line.replace('data: ', '')));
        const token = parsed.success ? parsed.data.choices[0]?.delta?.content : '';
        if (token) onToken(token);
      }
    }
  }

  async retryRequest<T>(request: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await request();
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => window.setTimeout(resolve, 500 * 2 ** attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error('OpenRouter request failed');
  }

  async rateLimit() {
    const gap = this.options.minRequestGapMs ?? 150;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < gap) {
      await new Promise((resolve) => window.setTimeout(resolve, gap - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async complete(payload: unknown) {
    await this.rateLimit();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenRouter request failed with status ${response.status}: ${body}`);
    }

    const json = OpenRouterResponseSchema.parse(await response.json());
    return json.choices[0]?.message?.content ?? '';
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.options.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.options.appUrl ?? 'https://studypilot.local',
      'X-Title': this.options.appTitle ?? 'StudyPilot AI'
    };
  }

  private buildAnswerPrompt(question: QuizQuestion, context: string) {
    const options = question.options.map((option) => `${option.label}. ${option.text}`).join('\n');

    return [
      'Answer this quiz question using the page context when helpful.',
      'Return only JSON: {"answer":"A","confidence":0.87,"explanation":"..."}',
      '',
      `Question: ${question.question}`,
      '',
      `Options:\n${options}`,
      '',
      `Page context:\n${context.slice(0, 6000)}`
    ].join('\n');
  }

  private parseModelAnswer(rawText: string) {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = ModelAnswerSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (parsed.success) return parsed.data;
    }

    const answer = rawText.match(/\b([A-H])\b/)?.[1] ?? rawText.slice(0, 20);
    return {
      answer,
      confidence: 0.5,
      explanation: rawText
    };
  }
}
