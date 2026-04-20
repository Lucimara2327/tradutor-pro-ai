
import { translateWithGemini, speakWithGemini } from './gemini';
import { translateText as translateWithOpenAI } from './openai';
import { AppSettings } from '../types';

export async function unifiedTranslate(
  text: string,
  fromLang: string,
  toLang: string,
  settings: AppSettings
): Promise<string> {
  const { engine, model, geminiApiKey, openaiApiKey } = settings;

  if (engine === 'gemini') {
    // Ensure we don't pass an OpenAI model to Gemini
    const geminiModel = model.startsWith('gpt') ? 'gemini-3-flash-preview' : model;
    return translateWithGemini(text, fromLang, toLang, geminiApiKey, geminiModel);
  } else {
    // Ensure we don't pass a Gemini model to OpenAI
    const openaiModel = model.startsWith('gemini') ? 'gpt-4o-mini' : model;
    return translateWithOpenAI(text, fromLang, toLang, openaiApiKey, openaiModel);
  }
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
