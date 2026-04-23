
import { GoogleGenAI, Modality } from "@google/genai";
import { getTranslationPrompt, getModeClassificationPrompt, getQualityCheckPrompt } from './prompts';

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
  translationStyle: 'normal' | 'fluent' | 'formal' | 'informal' | 'professional' | 'correct' = 'normal',
  isAdjustment: boolean = false
): Promise<string> {
  const style = translationStyle;

  async function attempt(retryCount = 0): Promise<string> {
    try {
      const ai = getGeminiClient(apiKey);
      const model = "gemini-3-flash-preview";

      const prompt = getTranslationPrompt({
        fromLang,
        toLang,
        style: translationStyle,
        text,
        isAdjustment
      });

      console.log(`[DEBUG] Gemini Request - Model: ${model} | Target: ${toLang}`);
      console.log(`[DEBUG] Prompt Sent:`, prompt);

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
      
      // Normalize errors for the orchestrator
      if (errorMsg.includes('API key not valid')) throw new Error('INVALID_KEY');
      if (errorMsg.includes('quota exceeded')) throw new Error('RATE_LIMIT');
      if (errorMsg.includes('not found')) throw new Error('MODEL_NOT_FOUND');
      if (errorMsg.includes('xhr error') || errorMsg.includes('Rpc failed')) throw new Error('NETWORK_OR_PROXY_ERROR');
      
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

/**
 * Classifica o pedido de ajuste do usuário usando Gemini
 */
export async function classifyAdjustmentMode(
  userInput: string,
  apiKey?: string
): Promise<'natural' | 'informal' | 'formal' | 'professional' | 'correct'> {
  const ai = getGeminiClient(apiKey);
  const prompt = getModeClassificationPrompt(userInput);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
      }
    });

    const result = response.text?.trim().toLowerCase() || 'natural';
    
    // Validação estrita do retorno
    if (result.includes('informal')) return 'informal';
    if (result.includes('formal')) return 'formal';
    if (result.includes('profissional') || result.includes('professional')) return 'professional'; // Mapeia para a chave professional do AppSettings
    if (result.includes('corrigir') || result.includes('correct')) return 'correct';
    
    return 'natural';
  } catch (error) {
    console.warn('[CLASSIFICATION_ERROR] Falha ao classificar comando:', error);
    return 'natural'; // Fallback seguro
  }
}

/**
 * Valida a qualidade de uma tradução usando Gemini
 */
export async function validateTranslationQuality(
  original: string,
  traducao: string,
  apiKey?: string
): Promise<boolean> {
  const ai = getGeminiClient(apiKey);
  const prompt = getQualityCheckPrompt(original, traducao);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0,
      }
    });

    const result = response.text?.trim().toLowerCase() || 'válido';
    return result.includes('válido') || !result.includes('inválido');
  } catch (error) {
    console.warn('[QUALITY_CHECK_ERROR] Falha ao verificar qualidade:', error);
    return true; // Fallback otimista para não bloquear o usuário
  }
}
