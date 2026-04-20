
import { translateWithGemini, speakWithGemini } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export interface TranslationResult {
  text: string;
  source: 'server' | 'client';
}

const translationCache = new Map<string, TranslationResult>();

const withTimeout = <T>(promise: Promise<T>, ms: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms)
    )
  ]);
};

export function checkCache(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): TranslationResult | null {
  const { engine, model, fluentMode } = settings;
  const cacheKey = `${engine}-${model}-${fluentMode}-${fromLang}-${toLang}-${text}`;
  return translationCache.get(cacheKey) || null;
}

async function translateLocal(text: string, fromLang: string, toLang: string): Promise<string> {
  try {
    const from = fromLang === 'auto' ? 'it' : fromLang; // MyMemory auto is a bit weird, 'it' or similar works
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${toLang}`;
    const response = await withTimeout(fetch(url), 5000);
    const data = await response.json();
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    throw new Error('Local translation failed');
  } catch (error) {
    console.error('Local fallback failed or timed out:', error);
    return `[Tradução Offline] ${text}`; // Last resort: return text with a tag
  }
}

export async function unifiedTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): Promise<TranslationResult> {
  const { engine, model, geminiApiKey, openaiApiKey, fluentMode } = settings;
  const cacheKey = `${engine}-${model}-${fluentMode}-${fromLang}-${toLang}-${text}`;

  // Check Cache first
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Helper to attempt a translation with specific parameters
  async function performTranslation(currentEngine: 'gemini' | 'openai'): Promise<TranslationResult> {
    // 1. Try Server-side API first
    try {
      const response = await withTimeout(fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fromLang, toLang, engine: currentEngine, model, fluentMode })
      }), 5000);

      const data = await response.json();

      if (response.ok && data.translatedText) {
        return { text: data.translatedText, source: 'server' };
      }
      
      // Handle specific missing key error to trigger client-side fallback
      if (data.code === 'INVALID_KEY' || (data.error && data.error.includes('KEY'))) {
        throw new Error('MISSING_OR_INVALID_BACKEND_KEY');
      }
      throw new Error(data.error || 'SERVER_ERROR');
    } catch (error: any) {
      // 2. Client-side Fallback
      try {
        let resultText = '';
        if (currentEngine === 'gemini') {
          const geminiModel = "gemini-1.5-flash";
          resultText = await withTimeout(translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel, fluentMode), 5000);
        } else {
          const openaiModel = model.startsWith('gemini') ? 'gpt-4o-mini' : model;
          resultText = await withTimeout(translateWithOpenAI(text, fromLang, toLang, openaiApiKey, openaiModel, fluentMode), 5000);
        }
        return { text: resultText, source: 'client' };
      } catch (clientErr) {
        console.error(`Client-side ${currentEngine} failed or timed out:`, clientErr);
        throw clientErr;
      }
    }
  }

  try {
    let result: TranslationResult;

    // Main logic: If Fluent Mode is ON, prioritize OpenAI
    if (fluentMode) {
      try {
        result = await performTranslation('openai');
      } catch (err) {
        console.warn('OpenAI Fluent translation failed, falling back to local...', err);
        const localText = await translateLocal(text, fromLang, toLang);
        result = { text: localText, source: 'client' };
      }
    } else {
      // Normal mode: Try Gemini first
      try {
        result = await performTranslation('gemini');
      } catch (err) {
        console.warn('Gemini translation failed, falling back to local...', err);
        const localText = await translateLocal(text, fromLang, toLang);
        result = { text: localText, source: 'client' };
      }
    }

    translationCache.set(cacheKey, result);
    return result;
  } catch (finalError: any) {
    console.error('Unified translation reached final error:', finalError);
    // Absolute final fallback to ensure NO ERROR is thrown to UI
    const finalLocalText = await translateLocal(text, fromLang, toLang);
    return { text: finalLocalText, source: 'client' };
  }
}

export async function unifiedSpeak(
  text: string,
  settings: AppSettings,
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore'
): Promise<string> {
  // Currently only Gemini supports TTS in our implementation
  // Ensure we use a valid model name for multimodal TTS
  return speakWithGemini(text, settings.geminiApiKey, voiceName);
}
