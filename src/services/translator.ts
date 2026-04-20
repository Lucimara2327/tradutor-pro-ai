
import { translateWithGemini, speakWithGemini } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export interface TranslationResult {
  text: string;
  source: 'server' | 'client';
}

export async function unifiedTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): Promise<TranslationResult> {
  const { engine, model, geminiApiKey, openaiApiKey } = settings;

  // Try Server-side API first (Secure Layer)
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, fromLang, toLang, engine, model })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.translatedText) {
        return { text: data.translatedText, source: 'server' };
      }
    }
    
    // If we get an error from server, check if it's because keys aren't set in backend
    try {
      const errorData = await response.json();
      if (errorData.source === 'server') {
        console.warn('Backend keys missing, falling back to client-side keys');
      }
    } catch {
      // ignore
    }
  } catch (error) {
    console.warn('Server API not available, falling back to client-side translation', error);
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

  return { text: resultText, source: 'client' };
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
