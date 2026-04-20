
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

/**
 * High-quality Text-to-Speech using Gemini 3.1 Flash TTS
 */
export async function speakWithGemini(
  text: string, 
  apiKey?: string,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<string> {
  const ai = getGeminiClient(apiKey);
  
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
    console.error('Gemini TTS error:', error);
    throw error;
  }
}

export async function translateWithGemini(
  text: string,
  fromLang: string,
  toLang: string,
  apiKey?: string,
  model: string = 'gemini-3-flash-preview'
): Promise<string> {
  const ai = getGeminiClient(apiKey);

  async function attempt(retryCount = 0): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: `Você é um tradutor profissional multilíngue. Traduza o texto abaixo fielmente para o idioma de destino.
Mantenha o tom, o sentido e a formatação originais. Não omita partes do texto.
Retorne APENAS o texto traduzido.

Contexto:
${fromLang === 'auto' ? 'Idioma detectado automaticamente' : `Idioma de origem: ${fromLang}`}
Idioma de destino: ${toLang}

Texto original:
${text}`,
        config: {
          temperature: 0.2,
        }
      });

      const translated = response.text?.trim();
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
    } catch (error) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      throw error;
    }
  }

  try {
    return await attempt();
  } catch (error: any) {
    console.error('Gemini translation error:', error);
    throw error;
  }
}
