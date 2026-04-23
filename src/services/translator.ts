
import { translateWithGemini, speakWithGemini, classifyAdjustmentMode, validateTranslationQuality } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export { classifyAdjustmentMode, validateTranslationQuality };

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

// --- Logica de desativação temporária do OpenAI (429) ---
let isOpenAIDisabled = false;
let openaiDisabledTimestamp = 0;
const OPENAI_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos de pausa

export function isOpenAIAvailable(): boolean {
  if (isOpenAIDisabled) {
    const now = Date.now();
    if (now - openaiDisabledTimestamp > OPENAI_COOLDOWN_MS) {
      isOpenAIDisabled = false;
      return true;
    }
    return false;
  }
  return true;
}

const deactivateOpenAI = () => {
  if (!isOpenAIDisabled) {
    isOpenAIDisabled = true;
    openaiDisabledTimestamp = Date.now();
    // System notice remains in console only
    console.warn(`[DEVELOPER_LOG] System Notice: OpenAI temporarily suspended (429). Routing traffic to Gemini.`);
  }
};

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

// 1. SILENCIAR ERROS NA UI - Centralized error handler (Silent)
const handleApiError = (error: any, context: string) => {
  const rawMsg = error?.message || String(error);
  const msg = rawMsg.toLowerCase();
  
  // Categorize quota/rate limit errors as non-critical warnings for the developer
  const isQuotaError = msg.includes('429') || msg.includes('quota') || msg.includes('rate_limit') || msg.includes('credits');
  const isAuthError = msg.includes('401') || msg.includes('invalid_key') || msg.includes('apikey') || msg.includes('config_missing_key');
  
  if (isQuotaError) {
    if (context.toLowerCase().includes('openai')) {
      deactivateOpenAI();
    }
    // Technical log remains in console only
    console.warn(`[DEVELOPER_LOG] ${context}: Quota/Rate limit encountered. Fallback logic engaged.`);
    return;
  }

  if (isAuthError) {
    console.warn(`[DEVELOPER_LOG] ${context}: Authentication/API Key issue.`);
    return;
  }

  // Identifica erros comuns para log técnico apenas (ex: WebSocket, Network)
  if (msg.includes('websocket') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('400') || msg.includes('network_or_proxy_error')) {
    console.warn(`[DEVELOPER_LOG] ${context}: Network/System detail: ${msg}`);
  } else {
    console.error(`[DEVELOPER_LOG] ${context} - Error detail:`, error);
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
    
    const translatedText = data.responseData?.translatedText;
    
    // Validar se o MyMemory não retornou erro ou conteúdo inválido
    if (translatedText && isValidTranslation(text, translatedText)) {
      return translatedText;
    }
  } catch (error) {
    handleApiError(error, 'translateLocal_MyMemory');
  }

  // 3. Fallback Heurístico (Heurística de segurança)
  // Se tudo falhar, retorna o texto original limpo. 
  // Removemos qualquer formatação suspeita que possa ter sido injetada por APIs quebradas.
  return text.trim(); 
}

// 7. VALIDAÇÃO DE RESPOSTA (isValidTranslation)
const isValidTranslation = (original: string, translated: string | null | undefined): boolean => {
  if (!translated || translated.trim() === "") return false;
  const cleanOrig = original.trim().toLowerCase();
  const cleanTrans = translated.trim().toLowerCase();

  // 1. Proibir frases iguais ao original (apenas para textos significativos)
  if (original.length > 15 && cleanOrig === cleanTrans) return false;

  // 2. Proibir recusas explícitas e erros de sistema técnicos
  const technicalErrors = [
    'quota exceeded', 'rate limit', 'insufficient credits', 'billing', 
    'unexpected error', 'api error', 'try again later', 'limit reached',
    'internal server error', 'service unavailable'
  ];
  if (technicalErrors.some(h => cleanTrans.includes(h))) return false;

  // 3. Se a resposta for uma recusa de segurança da IA (mas sem ser erro técnico)
  // No modo "dúvida", preferimos aceitar do que bloquear, a menos que seja claramente uma recusa
  const refusals = ['não posso traduzir', 'desculpe', 'como um modelo de linguagem', 'não tenho permissão'];
  if (refusals.some(r => cleanTrans.includes(r)) && cleanTrans.length < original.length / 2) return false;

  return true;
};

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

  // Solo try one engine
  async function performSingleTranslation(targetEngine: 'openai' | 'gemini'): Promise<TranslationResult> {
    const activeStyle = settings.translationStyle;
    const isAdjustment = !!settings.isAdjustment;
    
    if (targetEngine === 'openai' && !isOpenAIAvailable()) {
      throw new Error('OPENAI_QUOTA_COOLDOWN');
    }

    try {
      if (targetEngine === 'openai') {
        // 1. Tentar OpenAI via Server-side
        try {
          const response = await withTimeout(fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              text, fromLang, toLang, engine: 'openai', model: 'gpt-4o-mini', translationStyle: activeStyle, openaiApiKey, isAdjustment
            })
          }), 12000);

          if (response.ok) {
            const data = await response.json();
            if (data.translatedText && isValidTranslation(text, data.translatedText)) {
              return { text: data.translatedText, source: 'server' };
            }
          }
          if (response.status === 429) deactivateOpenAI();
        } catch (e) {
          handleApiError(e, 'OpenAI_Server_Attempt');
        }

        // 2. Tentar OpenAI via Client-side
        if (openaiApiKey) {
          try {
            const clientText = await withTimeout(translateWithOpenAI(text, fromLang, toLang, openaiApiKey, 'gpt-4o-mini', activeStyle, isAdjustment), 15000);
            if (isValidTranslation(text, clientText)) {
              return { text: clientText, source: 'client' };
            }
          } catch (e) {
            handleApiError(e, 'OpenAI_Client_Attempt');
          }
        }
        
        throw new Error('OPENAI_FAILED');
      } else {
        // Gemini Attempt
        try {
          const geminiModel = "models/gemini-3-flash-preview";
          const resultText = await withTimeout(translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel, activeStyle, isAdjustment), 15000);
          if (isValidTranslation(text, resultText)) {
            return { text: resultText, source: 'client' };
          }
        } catch (e) {
          handleApiError(e, 'Gemini_Attempt');
        }
        
        throw new Error('GEMINI_FAILED');
      }
    } catch (err: any) {
      throw err;
    }
  }

  try {
    // SEQUENTIAL FALLBACK LOGIC
    // 1. OpenAI
    try {
      const res = await performSingleTranslation('openai');
      translationCache.set(cacheKey, res);
      return res;
    } catch (openaiErr) {
      // 2. Gemini
      console.log("[DEBUG] Primary AI failed. Engaging Gemini fallback...");
      try {
        const res = await performSingleTranslation('gemini');
        translationCache.set(cacheKey, res);
        return res;
      } catch (geminiErr) {
        // 3. Local/Offline Fallback (Regra: Tentar de tudo antes de dar erro)
        console.warn("[DEBUG] All AIs failed. Using local fallback.");
        const localText = await translateLocal(text, fromLang, toLang);
        const res = { text: localText, source: 'client' as const };
        translationCache.set(cacheKey, res);
        return res;
      }
    }
  } catch (finalError: any) {
    // Só chegamos aqui se até o translateLocal falhou drasticamente
    throw new Error("Não foi possível traduzir agora. Tente novamente.");
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
