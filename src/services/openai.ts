
import OpenAI from 'openai';

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
  fluentMode: boolean = false
): Promise<string> {
  const client = getOpenAIClient(apiKey);

  async function attempt(retryCount = 0): Promise<string> {
    try {
      const isFluent = !!fluentMode;
      const fluentPrompt = `Translate the following text from ${fromLang === 'auto' ? 'source language' : fromLang} to ${toLang} in a natural, fluent and human-like way. Do not translate word by word. Adapt the sentence as a native speaker would say it. Use ONLY the translated text in the response.`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: isFluent 
              ? fluentPrompt
              : `Você é um tradutor profissional altamente experiente. Sua tarefa é traduzir o texto do usuário para o idioma de destino (${toLang}) de forma precisa e direta. Mantenha a integridade total do texto original. Responda APENAS com a tradução, sem explicações.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: isFluent ? 0.7 : 0.2,
      });

      const translated = response.choices[0]?.message?.content?.trim();
      if (!translated) {
        throw new Error('EMPTY_RESPONSE');
      }

      return translated;
    } catch (error: any) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      
      console.error('OpenAI attempt failed:', error.message || error);
      
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
