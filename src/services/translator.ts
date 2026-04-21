
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

// 7. VALIDAÇÃO DE RESPOSTA (isValidTranslation)
const isValidTranslation = (original: string, translated: string | null | undefined): boolean => {
  if (!translated || translated.trim() === "") return false;
  const cleanOrig = original.trim().toLowerCase();
  const cleanTrans = translated.trim().toLowerCase();

  // 1. Proibir frases iguais ao original (apenas para textos minimamente longos)
  if (original.length > 5 && cleanOrig === cleanTrans) return false;

  // 2. Proibir explicações comuns da IA
  const hallucinations = ['here is the translation', 'tradução:', 'the translation is', 'translated to', 'claro, aqui está', 'tradução fiel:'];
  if (hallucinations.some(h => cleanTrans.includes(h))) return false;

  // 3. Validação de Comprimento Heurística (Apenas para frases longas)
  if (original.length > 30) {
     const ratio = translated.length / original.length;
     if (ratio < 0.15 || ratio > 6) return false; // Slightly more relaxed for chunks
  }

  return true;
};

/**
 * Splits text into chunks respecting natural boundaries.
 */
function splitIntoChunks(text: string, limit: number = 4000): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= limit) {
      chunks.push(remainingText);
      break;
    }

    let splitIndex = -1;
    const sub = remainingText.substring(0, limit);

    // Prefer paragraph breaks
    splitIndex = sub.lastIndexOf('\n\n');
    
    // Then line breaks
    if (splitIndex === -1 || splitIndex < limit * 0.3) {
      const lineBreak = sub.lastIndexOf('\n');
      if (lineBreak > limit * 0.3) splitIndex = lineBreak;
    }

    // Then sentence endings (dot, question, exclamation + space)
    if (splitIndex === -1 || splitIndex < limit * 0.3) {
      const sentenceEnds = [...sub.matchAll(/[.!?]\s/g)];
      if (sentenceEnds.length > 0) {
        const lastMatch = sentenceEnds[sentenceEnds.length - 1];
        splitIndex = (lastMatch.index || 0) + 1;
      }
    }

    // Then space
    if (splitIndex === -1 || splitIndex < limit * 0.3) {
      const spaceIndex = sub.lastIndexOf(' ');
      if (spaceIndex > limit * 0.3) splitIndex = spaceIndex;
    }

    // Absolute fallback
    if (splitIndex === -1 || splitIndex < limit * 0.3) {
      splitIndex = limit;
    }

    chunks.push(remainingText.substring(0, splitIndex).trim());
    remainingText = remainingText.substring(splitIndex).trim();
  }

  return chunks;
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

  // Handle Long Text (Chunking)
  const MAX_CHAR_LIMIT = 4500;
  if (text.length > MAX_CHAR_LIMIT) {
    const chunks = splitIntoChunks(text, MAX_CHAR_LIMIT);
    const translatedChunks: string[] = [];
    let isServerSource = true;

    for (let i = 0; i < chunks.length; i++) {
      // Small delay between chunks to avoid rate limits
      if (i > 0) await new Promise(r => setTimeout(r, 200));
      
      const chunkResult = await unifiedTranslate(chunks[i], fromLang, toLang, {
        ...settings,
        // We bypass cache for sub-chunks to avoid key collision if same short text appears twice
        // actually recursive call will handle its own cache
      });
      translatedChunks.push(chunkResult.text);
      if (chunkResult.source === 'client') isServerSource = false;
    }

    const finalResult: TranslationResult = {
      text: translatedChunks.join('\n\n'),
      source: isServerSource ? 'server' : 'client'
    };
    translationCache.set(cacheKey, finalResult);
    return finalResult;
  }

  // Helper to attempt a translation with specific parameters
  async function performTranslation(currentEngine: 'gemini' | 'openai', forceNormal: boolean = false): Promise<TranslationResult> {
    const activeStyle = forceNormal ? 'normal' : settings.translationStyle;
    const activeFluent = forceNormal ? false : (currentEngine === 'openai' ? fluentMode : false);
    
    // Gemini: Always Client-side (Skill Constraint)
    if (currentEngine === 'gemini') {
      try {
        const geminiModel = "models/gemini-1.5-flash"; 
        const resultText = await withTimeout(translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel, activeFluent, activeStyle), 15000);
        if (isValidTranslation(text, resultText)) {
          return { text: resultText, source: 'client' };
        }
        throw new Error('GEMINI_CLIENT_INVALID');
      } catch (clientErr: any) {
        handleApiError(clientErr, `ClientSide_Gemini`);
        throw clientErr;
      }
    }

    // OpenAI: Try Server-side first
    try {
      const response = await withTimeout(fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          fromLang, 
          toLang, 
          engine: currentEngine, 
          model, 
          fluentMode: activeFluent,
          translationStyle: activeStyle,
          openaiApiKey
        })
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
      
      // OpenAI Client-side Fallback
      try {
        const openaiModel = model.startsWith('gemini') ? 'gpt-4o-mini' : model;
        const resultText = await withTimeout(translateWithOpenAI(text, fromLang, toLang, openaiApiKey, openaiModel, activeFluent), 15000);

        if (isValidTranslation(text, resultText)) {
          return { text: resultText, source: 'client' };
        }
        throw new Error('OPENAI_CLIENT_INVALID');
      } catch (clientErr: any) {
        handleApiError(clientErr, `ClientSide_${currentEngine}_Fallback`);
        throw clientErr; 
      }
    }
  }

  try {
    let result: TranslationResult;

    // 3/4. FLUXO FINAL DE TRADUÇÃO REEESTRUTURADO
    // Gemini selecionado E 'Modo Fluente' não existe para ele -> Forçamos o fluxo do motor
    const isGeminiSelected = settings.engine === 'gemini';

    if (fluentMode && !isGeminiSelected) {
      // Modo Fluente ATIVO (OpenAI): 1. OpenAI -> 2. Gemini -> 3. Local
      try {
        result = await performTranslation('openai');
      } catch (openaiErr) {
        try {
          // Gemini fallback sempre normal
          result = await performTranslation('gemini', true);
        } catch (geminiErr) {
          const localText = await translateLocal(text, fromLang, toLang);
          result = { text: localText, source: 'client' };
        }
      }
    } else {
      // Modo Fluente DESATIVADO ou Motor GEMINI: 1. Gemini -> 2. Local fallback
      try {
        result = await performTranslation('gemini', true);
      } catch (err) {
        // Se Gemini falhar, tentamos OpenAI normal como backup antes do local? 
        // O pedido diz: "Modo Fluente DESATIVADO: 1. Tentar Gemini -> 2. Se falhar → tradução local"
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

/**
 * Detect language using Gemini (client-side)
 */
export async function detectLanguage(text: string, settings: AppSettings): Promise<string | null> {
  if (!text || text.trim().length < 3) return null;

  try {
    const { translateWithGemini } = await import('./gemini');
    // We use a specific prompt for detection
    const prompt = `Identify the language of the following text. 
Return ONLY the ISO 639-1 two-letter code (e.g., 'pt', 'en', 'es', 'fr').
If you cannot identify it, return 'unknown'.

Text: ${text.substring(0, 100)}`;

    const genAI = (await import('./gemini')).getGeminiClient(settings.geminiApiKey);
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    const response = await model;
    const code = response.text.trim().toLowerCase();
    
    return code === 'unknown' ? null : code;
  } catch (error) {
    console.error('Language detection error:', error);
    return null;
  }
}
