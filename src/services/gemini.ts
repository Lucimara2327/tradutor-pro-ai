
import { GoogleGenAI, Modality } from "@google/genai";

let geminiClient: { client: any; key: string } | null = null;

export function getGeminiClient(key?: string): any {
  const apiKey = key || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('CONFIG_MISSING_KEY');
  }

  if (!geminiClient || geminiClient.key !== apiKey) {
    geminiClient = {
      client: new GoogleGenAI({ apiKey }),
      key: apiKey
    };
  }
  return geminiClient.client;
}

let ttsCircuitBreaker: number = 0;

/**
 * High-quality Text-to-Speech using Gemini 3.1 Flash TTS
 */
export async function speakWithGemini(
  text: string, 
  apiKey?: string,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<string> {
  // Circuit breaker check (1 minute cooldown if quota hit)
  if (Date.now() < ttsCircuitBreaker) {
    throw new Error('TTS_SERVICE_COOLDOWN');
  }

  const ai = getGeminiClient(apiKey);
  
  if (!text || !text.trim()) {
    throw new Error('EMPTY_TEXT');
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error('NO_AUDIO_DATA');
    }

    return base64Audio;
  } catch (error: any) {
    let errorMsg = error.message || String(error);
    try {
      if (typeof errorMsg === 'string' && errorMsg.startsWith('{')) {
        const parsed = JSON.parse(errorMsg);
        errorMsg = parsed.error?.message || parsed.message || errorMsg;
      }
    } catch (e) {}

    // Handle Quota / Rate Limit
    if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit') || errorMsg.toLowerCase().includes('exhausted')) {
      console.warn('Gemini TTS Quota Exceeded. Activating circuit breaker for 60s.');
      ttsCircuitBreaker = Date.now() + 60000; // 60 second cooldown
      throw new Error('RATE_LIMIT');
    }

    console.error('Gemini TTS error:', errorMsg);
    throw new Error(errorMsg);
  }
}

export async function translateWithGemini(
  text: string,
  fromLang: string,
  toLang: string,
  apiKey?: string,
  _ignoredModel: string = 'gemini-1.5-flash',
  fluentMode: boolean = false
): Promise<string> {
  async function attempt(retryCount = 0): Promise<string> {
    try {
      const ai = getGeminiClient(apiKey);
      const model = "gemini-3-flash-preview";

      const prompt = `Você é um tradutor rápido. Traduza de ${fromLang === 'auto' ? 'detectado' : fromLang} para ${toLang}.
Regras:
- TRADUÇÃO DIRETA, LITERAL e CORRETA.
- NÃO use modo fluente ou reescrita.
- Priorize velocidade e fidelidade literal.
- Se houver ambiguidade, escolha o significado mais comum.
- Retorne APENAS o texto traduzido.

Texto original:
${text}`;

      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          temperature: 0,
        }
      });

      const translated = response.text?.trim();
      if (!translated) {
        throw new Error('EMPTY_RESPONSE');
      }

      return translated;
    } catch (error: any) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      
      let errorMsg = error.message || String(error);
      try {
        // Many Gemini errors are returned as JSON strings
        if (typeof errorMsg === 'string' && errorMsg.startsWith('{')) {
          const parsed = JSON.parse(errorMsg);
          errorMsg = parsed.error?.message || parsed.message || errorMsg;
        }
      } catch (e) {
        // Not JSON, keep original
      }

      console.error('Gemini attempt failed:', errorMsg);
      
      // Throw normalized error for the orchestrator
      if (errorMsg.includes('API key not valid')) throw new Error('INVALID_KEY');
      if (errorMsg.includes('quota exceeded')) throw new Error('RATE_LIMIT');
      if (errorMsg.includes('not found')) throw new Error('MODEL_NOT_FOUND');
      
      throw new Error(errorMsg);
    }
  }

  try {
    return await attempt();
  } catch (error: any) {
    console.error('Gemini catastrophic failure:', error);
    throw error;
  }
}
