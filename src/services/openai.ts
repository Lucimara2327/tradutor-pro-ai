
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
      const fluentPrompt = `
Regras do MODO FLUENTE ATIVADO:
- Gere uma tradução NATURAL, como um falante nativo escreveria.
- Não traduza palavra por palavra; foque no contexto e na fluidez.
- Ajuste a gramática e a estrutura da frase para soar humana e idiomática.
- Mantenha o nível de formalidade do original, mas adaptado culturalmente.
- Use APENAS o texto traduzido na resposta.`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: `Você é um tradutor profissional altamente experiente. Sua tarefa é traduzir o texto do usuário para o idioma de destino (${toLang}) de forma ${isFluent ? 'NATURAL, HUMANA e CONTEXTUAL (Modo Fluente)' : 'precisa e direta'}. 
${isFluent ? fluentPrompt : "Mantenha a integridade total do texto original. Responda APENAS com a tradução, sem explicações."}`
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

      // Length validation
      const originalWords = text.trim().split(/\s+/).length;
      const translatedWords = translated.split(/\s+/).length;

      if (originalWords > 5 && translatedWords < 2 && retryCount < 2) {
        return await attempt(retryCount + 1);
      }

      return translated;
    } catch (error: any) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      
      console.error('Translation error:', error);
      
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
