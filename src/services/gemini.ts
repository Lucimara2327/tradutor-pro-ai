
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
      model: "gemini-1.5-flash",
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
  _ignoredModel: string = 'gemini-1.5-flash',
  fluentMode: boolean = false
): Promise<string> {
  async function attempt(retryCount = 0): Promise<string> {
    try {
      const ai = getGeminiClient(apiKey);
      const model = "gemini-1.5-flash";

      const fluentRules = `
Regras do MODO FLUENTE ATIVADO:
- Gere uma tradução NATURAL, como um falante nativo escreveria.
- Não traduza palavra por palavra; foque no contexto e na fluidez.
- Ajuste a gramática e a estrutura da frase para soar humana e idiomática.
- Mantenha o nível de formalidade (casual, profissional ou neutro) do original, mas adaptado culturalmente.
- Se for uma expressão idiomática, use a equivalente no idioma de destino.`;

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: `Você é um tradutor profissional multilíngue. Traduza o texto abaixo ${fluentMode ? 'de forma FLUENTE e NATURAL' : 'fielmente'} para o idioma de destino.
${fluentMode ? fluentRules : 'Mantenha o tom, o sentido e a formatação originais. Não omita partes do texto.'}
Retorne APENAS o texto traduzido.

Contexto:
${fromLang === 'auto' ? 'Idioma detectado automaticamente' : `Idioma de origem: ${fromLang}`}
Idioma de destino: ${toLang}

Texto original:
${text}` }] }],
        config: {
          temperature: fluentMode ? 0.7 : 0.2,
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
    } catch (error: any) {
      if (retryCount < 1) return await attempt(retryCount + 1);
      console.warn('Gemini inner translation attempt failed:', error.message || error);
      throw error;
    }
  }

  try {
    return await attempt();
  } catch (error: any) {
    console.error('Gemini translation catastrophic failure:', error);
    throw error;
  }
}
