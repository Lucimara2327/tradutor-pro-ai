
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
  model: string = 'gpt-4o-mini'
): Promise<string> {
  const client = getOpenAIClient(apiKey);

  try {
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `Traduza o seguinte texto de forma natural e precisa para o idioma solicitado. Retorne apenas a tradução. De: ${fromLang} Para: ${toLang}`
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
    });

    const translated = response.choices[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error('EMPTY_RESPONSE');
    }

    return translated;
  } catch (error: any) {
    console.error('Translation error:', error);
    
    if (error.status === 401) {
      throw new Error('INVALID_KEY');
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
