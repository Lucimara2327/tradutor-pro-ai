
export interface Translation {
  id: string;
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: number;
  isFavorite: boolean;
}

export interface AppSettings {
  openaiApiKey: string;
  geminiApiKey: string;
  theme: 'light' | 'dark';
  autoPlayAudio: boolean;
  model: string;
  engine: 'gemini' | 'openai';
  fluentMode: boolean;
}

export type LanguageCode = string;

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}
