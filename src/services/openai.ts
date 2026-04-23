
import OpenAI from 'openai';
import { getTranslationPrompt, validatePromptIntegrity } from './prompts';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(apiKey: string): OpenAI {
  if (!openaiClient || openaiClient.apiKey !== apiKey) {
    if (!apiKey) {
      throw new Error('CONFIG_MISSING_KEY');
    }
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Specific for this web context as requested
    });
  }
  return openaiClient;
}

export async function translateText(
  text: string,
  fromLang: string,
  toLang: string,
  apiKey: string,
  model: string = 'gpt-4o-mini',
  style: 'normal' | 'fluent' | 'formal' | 'informal' | 'professional' | 'correct' = 'normal',
  isAdjustment: boolean = false
): Promise<string> {
  const client = getOpenAIClient(apiKey);

  async function attempt(retryCount = 0): Promise<string> {
    try {
      const prompt = getTranslationPrompt({
        fromLang,
        toLang,
        style,
        text,
        isAdjustment
      });

      // Validação de Integridade (Regra 5 e 8)
      if (!validatePromptIntegrity(prompt)) {
        throw new Error('PROMPT_INTEGRITY_FAILED');
      }

      console.log(`[DEBUG] OpenAI Request - Model: ${model} | Target: ${toLang}`);
      console.log(`[DEBUG] System Prompt:`, prompt);

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: isAdjustment ? 0.2 : 0.05,
      });

      const translated = response.choices[0]?.message?.content?.trim();
      if (!translated) {
        throw new Error('EMPTY_RESPONSE');
      }

      return translated;
    } catch (error: any) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      
      if (error.status !== 429) {
        console.warn('OpenAI attempt failed:', error.message || error);
      }
      
      if (error.status === 401) {
        throw new Error('INVALID_KEY');
      }
      if (error.status === 404) {
        throw new Error('MODEL_NOT_FOUND');
      }
      if (error.status === 429) {
        throw new Error('RATE_LIMIT_OR_CREDITS');
      }
      if (!navigator.onLine) {
        throw new Error('NO_CONNECTION');
      }
      
      throw new Error(error.message || 'GENERAL_ERROR');
    }
  }

  return await attempt();
}
