
import { translateWithGemini, speakWithGemini } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export interface TranslationResult {
  text: string;
  source: 'server' | 'client';
}

const translationCache = new Map<string, TranslationResult>();

export function checkCache(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): TranslationResult | null {
  const { engine, model } = settings;
  const cacheKey = `${engine}-${model}-${fromLang}-${toLang}-${text}`;
  return translationCache.get(cacheKey) || null;
}

export async function unifiedTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): Promise<TranslationResult> {
  const { engine, model, geminiApiKey, openaiApiKey } = settings;
  const cacheKey = `${engine}-${model}-${fromLang}-${toLang}-${text}`;

  // Check Cache first
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Try Server-side API first (Secure Layer)
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, fromLang, toLang, engine, model })
    });

    const data = await response.json();

    if (response.ok) {
      if (data.translatedText) {
        const result: TranslationResult = { text: data.translatedText, source: 'server' };
        translationCache.set(cacheKey, result);
        return result;
      }
    }
    
    // If we get an error from server, check if it's because keys aren't set in backend
    if (data.source === 'server' || data.code === 'INVALID_KEY' || (data.error && data.error.includes('KEY'))) {
      console.warn('Backend keys missing or invalid, falling back to client-side keys');
    } else if (response.status >= 500) {
      throw new Error('SERVER_OVERLOAD');
    } else {
      throw new Error(data.error || 'SERVER_ERROR');
    }
  } catch (error: any) {
    if (error.message === 'SERVER_OVERLOAD') {
      throw new Error('O servidor está sobrecarregado no momento. Tente novamente em alguns segundos.');
    }
    console.warn('Server API error or not available, falling back to client-side translation', error);
  }

  // Fallback to client-side translation (Legacy/Local usage)
  let resultText = '';
  if (engine === 'gemini') {
    // Ensure we don't pass an OpenAI model to Gemini
    const geminiModel = model.startsWith('gpt') ? 'gemini-3-flash-preview' : model;
    resultText = await translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel);
  } else {
    // Ensure we don't pass a Gemini model to OpenAI
    const openaiModel = model.startsWith('gemini') ? 'gpt-4o-mini' : model;
    resultText = await translateWithOpenAI(text, fromLang, toLang, openaiApiKey, openaiModel);
  }

  const finalResult: TranslationResult = { text: resultText, source: 'client' };
  translationCache.set(cacheKey, finalResult);
  return finalResult;
}

export async function unifiedSpeak(
  text: string,
  settings: AppSettings,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<string> {
  // Currently only Gemini supports TTS in our implementation
  // We can add OpenAI TTS (OpenAI Audio API) here in the future
  return speakWithGemini(text, settings.geminiApiKey, voiceName);
}
