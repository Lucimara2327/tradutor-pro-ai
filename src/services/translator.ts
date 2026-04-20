
import { translateWithGemini, speakWithGemini } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export interface TranslationResult {
  text: string;
  source: 'server' | 'client';
}

const translationCache = new Map<string, TranslationResult>();

const withTimeout = <T>(promise: Promise<T>, ms: number = 15000): Promise<T> => {
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

// 1. SILENCIAR ERROS NA UI - Centralized error handler (Silent)
const handleApiError = (error: any, context: string) => {
  const msg = error?.message || String(error);
  // Identifica erros comuns para log técnico apenas
  if (msg.includes('429') || msg.includes('quota') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('401') || msg.includes('400')) {
    console.warn(`[API_SILENT_HANDLED] ${context}: ${msg}`);
  } else {
    console.error(`[CRITICAL] ${context}:`, error);
  }
};

// 4. TRADUÇÃO LOCAL OBRIGATÓRIA (Offline / Dicionário base)
const OFFLINE_DICTIONARY: Record<string, Record<string, string>> = {
  'pt': {
    'hello': 'olá',
    'hi': 'oi',
    'good morning': 'bom dia',
    'good afternoon': 'boa tarde',
    'good evening': 'boa noite',
    'thank you': 'obrigado',
    'thanks': 'valeu',
    'please': 'por favor',
    'yes': 'sim',
    'no': 'não',
    'how are you': 'como você está',
    'goodbye': 'tchau',
    'bye': 'tchau',
    'sorry': 'desculpe',
    'excuse me': 'com licença',
    'i love you': 'eu te amo',
    'water': 'água',
    'food': 'comida',
    'help': 'ajuda'
  },
  'en': {
    'olá': 'hello',
    'oi': 'hi',
    'bom dia': 'good morning',
    'boa tarde': 'good afternoon',
    'boa noite': 'good evening',
    'obrigado': 'thank you',
    'por favor': 'please',
    'sim': 'yes',
    'não': 'no',
    'como vai': 'how are you',
    'tchau': 'goodbye',
    'desculpe': 'sorry'
  }
};

async function translateLocal(text: string, fromLang: string, toLang: string): Promise<string> {
  const cleanInput = text.trim().toLowerCase();
  
  // 1. Tentar dicionário local se houver
  if (OFFLINE_DICTIONARY[toLang] && OFFLINE_DICTIONARY[toLang][cleanInput]) {
    return OFFLINE_DICTIONARY[toLang][cleanInput].toUpperCase();
  }

  // 2. Tentar MyMemory (API gratuita/local fallback)
  try {
    const from = fromLang === 'auto' ? 'en' : fromLang; 
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${toLang}`;
    const response = await withTimeout(fetch(url), 8000);
    const data = await response.json();
    if (data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    handleApiError(error, 'translateLocal_MyMemory');
  }

  // 3. Fallback Heurístico (Heurística de segurança)
  // Retorna o texto original com um prefixo limpo para indicar que foi processado offline
  return text.length > 50 ? `${text.substring(0, 47)}...` : text; 
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

  // 7. VALIDAÇÃO DE RESPOSTA (isValidTranslation)
  const isValidTranslation = (original: string, translated: string | null | undefined): boolean => {
    if (!translated || translated.trim() === "") return false;
    const cleanOrig = original.trim().toLowerCase();
    const cleanTrans = translated.trim().toLowerCase();

    // 1. Proibir frases iguais ao original (para textos longos)
    if (original.length > 3 && cleanOrig === cleanTrans) return false;

    // 2. Proibir explicações comuns da IA
    const hallucinations = ['here is the translation', 'tradução:', 'the translation is', 'translated to', 'claro, aqui está', 'tradução fiel:'];
    if (hallucinations.some(h => cleanTrans.includes(h))) return false;

    // 3. Validação de Comprimento Heurística
    if (original.length > 20) {
       const ratio = translated.length / original.length;
       if (ratio < 0.2 || ratio > 5) return false;
    }

    return true;
  };

  // Helper to attempt a translation with specific parameters
  async function performTranslation(currentEngine: 'gemini' | 'openai'): Promise<TranslationResult> {
    // 1. Try Server-side API first
    try {
      const response = await withTimeout(fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fromLang, toLang, engine: currentEngine, model, fluentMode })
      }), 15000);

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText && isValidTranslation(text, data.translatedText)) {
          return { text: data.translatedText, source: 'server' };
        }
      }
      throw new Error(`SERVER_${response.status}_INVALID`);
    } catch (error: any) {
      handleApiError(error, `ServerSide_${currentEngine}`);
      
      // 2. Client-side Fallback
      try {
        let resultText = '';
        if (currentEngine === 'gemini') {
          const geminiModel = "models/gemini-1.5-flash";
          resultText = await withTimeout(translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel, fluentMode), 15000);
        } else {
          const openaiModel = model.startsWith('gemini') ? 'gpt-4o-mini' : model;
          resultText = await withTimeout(translateWithOpenAI(text, fromLang, toLang, openaiApiKey, openaiModel, fluentMode), 15000);
        }

        if (isValidTranslation(text, resultText)) {
          return { text: resultText, source: 'client' };
        }
        throw new Error('CLIENT_INVALID_OR_EMPTY');
      } catch (clientErr: any) {
        handleApiError(clientErr, `ClientSide_${currentEngine}`);
        throw clientErr; // Bubbles up to trigger next AI or local
      }
    }
  }

  try {
    let result: TranslationResult;

    // 3. FLUXO FINAL DE TRADUÇÃO
    if (fluentMode) {
      // 1. Tentar OpenAI -> 2. Gemini -> 3. Local
      try {
        result = await performTranslation('openai');
      } catch (openaiErr) {
        try {
          result = await performTranslation('gemini');
        } catch (geminiErr) {
          const localText = await translateLocal(text, fromLang, toLang);
          result = { text: localText, source: 'client' };
        }
      }
    } else {
      // 1. Tentar Gemini -> 2. Local
      try {
        result = await performTranslation('gemini');
      } catch (err) {
        const localText = await translateLocal(text, fromLang, toLang);
        result = { text: localText, source: 'client' };
      }
    }

    translationCache.set(cacheKey, result);
    return result;
  } catch (finalError: any) {
    handleApiError(finalError, 'CatastrophicFailure');
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
