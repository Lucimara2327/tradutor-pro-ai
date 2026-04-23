
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
      const systemPrompt = `Você é um tradutor profissional e neutro de alta precisão. Sua tarefa é traduzir o texto para o idioma de destino (${toLang}) seguindo regras rígidas:

1. TRADUÇÃO FIEL: Traduza exatamente o significado do texto original. NÃO adicione conteúdo ofensivo, sexual ou inventado. NÃO altere o sentido original.
2. COMPORTAMENTO: Seja neutro e profissional. NÃO interprete ou invente contexto. NÃO use linguagem vulgar ou inadequada.
3. PRECISÃO: Se o texto for simples, a tradução deve ser direta e correta.
4. PROIBIÇÃO: Nunca gere conteúdo ofensivo que não esteja no original. Nunca exagere ou modifique o tom original.
5. SAÍDA: Retorne APENAS a tradução. SEM aspas, SEM comentários extras, SEM explicações.

Estilo: ${isPolishing ? `MODO POLIDO/NATURAL: 
    1. Prioridade: Texto soar 100% natural, profissional e "nativo". 
    2. Melhore a fluidez, gramática e conexão entre frases. 
    3. Substitua traduções literais por expressões comuns no idioma destino.
    4. Mantenha o tom original (formal/casual).
    5. NÃO mude o significado.` : 'NORMAL (tradução direta e fiel)'}`;

      console.log(`[DEBUG] OpenAI Request - Model: ${model} | Target: ${toLang}`);
      console.log(`[DEBUG] System Prompt:`, systemPrompt);

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
