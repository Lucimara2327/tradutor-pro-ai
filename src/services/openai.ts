
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
  isPolishing: boolean = false
): Promise<string> {
  const client = getOpenAIClient(apiKey);

  async function attempt(retryCount = 0): Promise<string> {
    try {
      const systemPrompt = `Traduza o texto de forma precisa e segura para o idioma de destino: ${toLang}.

Regras obrigatórias:
- NÃO inventar conteúdo.
- NÃO adicionar palavras que não existem no original.
- NÃO usar linguagem ofensiva.
- Manter o significado original da frase.
- Adaptar levemente apenas para soar natural.
- Se a frase for simples, manter a tradução simples.

Estilo: ${isPolishing ? `MODO POLIDO/NATURAL: 
    1. Prioridade: Texto soar 100% natural, profissional e "nativo". 
    2. Melhore a fluidez, gramática e conexão entre frases. 
    3. Substitua traduções literais por expressões comuns no idioma destino.
    4. Mantenha o tom original (formal/casual).
    5. NÃO mude o significado.` : 'NORMAL (tradução direta e fiel)'}

IMPORTANTE: Retorne APENAS a tradução final, sem aspas e sem explicações.`;

      const response = await client.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: isPolishing ? 0.2 : 0.05,
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
