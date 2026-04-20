
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

      const normalPrompt = `Você é um tradutor profissional. Sua tarefa é traduzir o texto de forma DIRETA, LITERAL e FIEL. 
REGRAS:
- PRIORIDADE: Sempre priorize a tradução literal.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- NÃO interprete o texto.
- NÃO adicione palavras ou explicações.
- Mantenha a estrutura exata da frase original.
- Responda APENAS com a tradução.
Idioma de destino: ${toLang}`;

      const fluentPrompt = `Você é um tradutor profissional. Sua tarefa é traduzir o texto de forma NATURAL e FLUIDA, mas mantendo a FIDELIDADE ABSOLUTA ao significado original.
REGRAS:
- PRIORIDADE: Priorize a fidelidade à tradução literal antes da fluidez.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- NÃO reformule o sentido.
- NÃO invente frases ou adicione palavras (como "querido", "amigo", etc).
- Ajuste apenas a gramática e concordância para soar natural no idioma de destino.
- Responda APENAS com a tradução.
Idioma de destino: ${toLang}`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: isFluent ? fluentPrompt : normalPrompt
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: isFluent ? 0.3 : 0.1,
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
