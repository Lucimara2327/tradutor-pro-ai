
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

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: `Traduza o seguinte texto de forma natural e precisa para o idioma solicitado. Retorne APENAS o texto traduzido, sem explicações.
Origem: ${fromLang}
Destino: ${toLang}
Texto: ${text}`,
      config: {
        temperature: 0.3,
      }
    });

    const translated = response.text?.trim();
    if (!translated) {
      throw new Error('EMPTY_RESPONSE');
    }

    return translated;
  } catch (error: any) {
    console.error('Gemini translation error:', error);
    throw error;
  }
}
