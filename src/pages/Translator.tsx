
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Volume2, 
  Trash2, 
  Sparkles, 
  Camera, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LANGUAGES } from '@/src/constants';
import { AppSettings, Translation } from '@/src/types';
import { unifiedTranslate, unifiedSpeak, checkCache } from '@/src/services/translator';
import { cn } from '@/src/utils';

interface TranslatorProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addTranslation: (t: Translation) => void;
}

export default function Translator({ settings, setSettings, addTranslation }: TranslatorProps) {
  const [inputText, setInputText] = useState(() => localStorage.getItem('translator_inputText') || '');
  const [translatedText, setTranslatedText] = useState(() => localStorage.getItem('translator_translatedText') || '');
  
  // Initial state from localStorage for persistence
  const [fromLang, setFromLang] = useState(() => localStorage.getItem('translator_fromLang') || 'auto');
  const [toLang, setToLang] = useState(() => localStorage.getItem('translator_toLang') || 'en');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [translationSource, setTranslationSource] = useState<'server' | 'client' | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');

  const ttsTimeoutRef = useRef<number | null>(null);
  const lastInputRef = useRef<string>(
    (() => {
      const text = localStorage.getItem('translator_inputText') || '';
      if (!text) return '';
      const f = localStorage.getItem('translator_fromLang') || 'auto';
      const t = localStorage.getItem('translator_toLang') || 'en';
      return `${text.trim()}-${f}-${t}-${settings.engine}-${settings.model}`;
    })()
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSpeechIdRef = useRef<number>(0);

  // Persistence effect
  useEffect(() => {
    localStorage.setItem('translator_fromLang', fromLang);
    localStorage.setItem('translator_toLang', toLang);
    localStorage.setItem('translator_inputText', inputText);
    localStorage.setItem('translator_translatedText', translatedText);
  }, [fromLang, toLang, inputText, translatedText]);

  useEffect(() => {
    // Stop all audio on unmount
    return () => {
      window.speechSynthesis.cancel();
      stopGeminiAudio();
    };
  }, []);

  // Clear translation if input is empty
  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText('');
      lastInputRef.current = '';
    }
  }, [inputText]);

  const stopGeminiAudio = () => {
    if (currentAudioSourceRef.current) {
      currentAudioSourceRef.current.stop();
      currentAudioSourceRef.current = null;
    }
    setIsSpeaking(false);
  };

  const handleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = fromLang === 'auto' ? 'pt-BR' : fromLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const fullText = finalTranscript || interimTranscript;
      if (fullText) {
        setInputText(prev => prev + ' ' + fullText.trim());
        // Deduplicate or just append? Appending usually better for continuous
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      const errorMsg = event.error === 'not-allowed' 
        ? "Microfone bloqueado. Por favor, permita o acesso nas configurações do navegador."
        : event.error === 'no-speech'
        ? "Nenhuma fala detectada. Tente novamente."
        : "Erro no microfone: " + event.error;
        
      setError(errorMsg);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(prev => (prev ? prev + '\n' + text : text));
      }
    } catch (err) {
      setError("Não foi possível acessar a área de transferência.");
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim() || isLoading) return;
    
    // Composite key for optimization
    const currentContext = `${inputText.trim()}-${fromLang}-${toLang}-${settings.engine}-${settings.model}`;
    if (currentContext === lastInputRef.current) return;
    
    // Check cache synchronously for perceived performance
    const cached = checkCache(inputText.trim(), fromLang, toLang, settings);
    if (cached) {
      setTranslatedText(cached.text);
      setTranslationSource(cached.source);
      lastInputRef.current = currentContext;
      return;
    }

    lastInputRef.current = currentContext;

    setIsLoading(true);
    setError(null);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    try {
      const result = await unifiedTranslate(
        inputText,
        fromLang,
        toLang,
        settings
      );

      setTranslatedText(result.text);
      setTranslationSource(result.source);
      
      const newTranslation: Translation = {
        id: crypto.randomUUID(),
        originalText: inputText,
        translatedText: result.text,
        fromLang,
        toLang,
        timestamp: Date.now(),
        isFavorite: false,
      };
      
      addTranslation(newTranslation);

      if (settings.autoPlayAudio) {
        speak(result.text, toLang);
      }
    } catch (err: any) {
      // Logic leaks: unifiedTranslate already returns a fallback, 
      // but if something catastrophic happens during result processing:
      console.error('Catastrophic translation error handled:', err);
      // Ensure we don't leave the user hanging
      setTranslatedText(inputText);
      setTranslationSource('client');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = () => {
    if (fromLang === 'auto') return;
    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speak = async (text: string, langCode: string) => {
    // 1. Cancel everything immediately
    window.speechSynthesis.cancel();
    stopGeminiAudio();
    if (!text) return;

    // 2. Track this request
    const speechId = ++currentSpeechIdRef.current;
    setIsSpeaking(true);

    try {
      // 3. Try high-quality Gemini TTS (async fetch)
      const base64Data = await unifiedSpeak(text, settings);
      
      // 4. Critical check: did someone request a different audio while we were fetching?
      if (speechId !== currentSpeechIdRef.current) {
        console.log('Aborting play: newer speech request detected');
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = binaryString.charCodeAt(i) | (binaryString.charCodeAt(i + 1) << 8);
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, bytes.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < bytes.length; i++) {
        channelData[i] = bytes[i] / 32768.0;
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      // Add gain node for volume control (to avoid "screaming" audio)
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0.7; // As requested, set to 0.7 for comfort
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (speechId === currentSpeechIdRef.current) {
            setIsSpeaking(false);
            currentAudioSourceRef.current = null;
        }
      };
      
      currentAudioSourceRef.current = source;
      source.start();

    } catch (error) {
      // 5. Final fallback check
      if (speechId !== currentSpeechIdRef.current) return;

      console.warn('Gemini TTS failed, falling back to system TTS', error);
      // System Fallback
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Language targeting
      const targetLang = langCode === 'auto' ? 'pt-BR' : langCode;
      utterance.lang = targetLang;
      
      // User requested properties: suave, natural e agradável
      utterance.volume = 0.7;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select better voice
      // Pre-fetching voices often reduces initial delay
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Try to find a high-quality/natural voice for the target language
        const preferredVoice = voices.find(v => 
          v.lang.startsWith(targetLang) && 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        ) || voices.find(v => v.lang.startsWith(targetLang));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        if (speechId === currentSpeechIdRef.current) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (speechId === currentSpeechIdRef.current) setIsSpeaking(false);
      };
      utterance.onerror = () => {
        if (speechId === currentSpeechIdRef.current) setIsSpeaking(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    localStorage.removeItem('translator_inputText');
    localStorage.removeItem('translator_translatedText');
    setError(null);
    setIsSpeaking(false);
    setIsListening(false);
    window.speechSynthesis.cancel();
    stopGeminiAudio();
    recognitionRef.current?.stop();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingOCR(true);
    setOcrProgress(0);
    setOcrStatus('Processando imagem...');
    setError(null);

    try {
      // 1. Resize and compress image for faster OCR (highly aggressive)
      const processedImage = await preprocessImage(file);
      
      setOcrStatus('Extraindo texto...');
      // 2. OCR with Tesseract.js (Fast configuration)
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('por+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      
      const { data: { text } } = await worker.recognize(processedImage);
      await worker.terminate();

      if (text && text.trim()) {
        const cleanedText = text.trim()
          .replace(/\n\s*\n/g, '\n') // Remove empty lines
          .replace(/\s+/g, ' ');      // Normalize spaces
        
        setInputText(cleanedText);
        setOcrProgress(100);
        setOcrStatus('Traduzindo...');
        
        // The auto-translate useEffect will pick this up immediately
      } else {
        setError('Não foi possível encontrar texto legível nesta imagem.');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Erro ao processar imagem.');
    } finally {
      setTimeout(() => {
        setIsProcessingOCR(false);
        setOcrProgress(0);
        setOcrStatus('');
      }, 500);
      e.target.value = '';
    }
  };

  const preprocessImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Even faster resolution
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context failed'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // More aggressive compression for speed
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="mt-4 lg:mt-6 space-y-8 animate-in fade-in duration-700 pb-20 overflow-x-hidden px-1">
      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />

      {/* 1. TOPO: Seleção de Idioma */}
      <div className="relative space-y-4">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="flex flex-col gap-1.5 p-4 rounded-3xl glass-card bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/5 shadow-sm transition-all">
            <span className="text-[10px] font-black uppercase tracking-[2px] text-[#7B3FE4] opacity-80">Origem</span>
            <select 
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer w-full text-[var(--text-main)]"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#0f172a]">{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 p-4 rounded-3xl glass-card bg-white dark:bg-zinc-900/50 border-slate-200 dark:border-white/5 shadow-sm transition-all text-right">
            <span className="text-[10px] font-black uppercase tracking-[2px] text-[#3F8EFC] opacity-80">Destino</span>
            <select 
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="bg-transparent text-sm font-bold focus:outline-none appearance-none cursor-pointer w-full text-right text-[var(--text-main)]"
            >
              {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                <option key={lang.code} value={lang.code} className="bg-white dark:bg-[#0f172a]">{lang.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button 
            onClick={handleSwap}
            disabled={fromLang === 'auto'}
            className={cn(
              "p-3 rounded-full glass-card hover:bg-[#7B3FE4] hover:text-white active:scale-90 transition-all shadow-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10",
              fromLang === 'auto' && "opacity-30 cursor-not-allowed"
            )}
          >
            <ArrowLeftRight size={20} />
          </button>
        </div>
      </div>
    
      {/* Opção Modo Fluente - MOSTRAR APENAS SE FOR OPENAI */}
      {settings.engine === 'openai' && (
        <div className="flex items-center justify-end px-2">
          <button
            onClick={() => setSettings(prev => ({ ...prev, fluentMode: !prev.fluentMode }))}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl transition-all border font-bold text-xs uppercase tracking-widest",
              settings.fluentMode 
                ? "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-sm shadow-purple-500/5" 
                : "bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500"
            )}
          >
            <Sparkles size={14} className={cn(settings.fluentMode && "animate-pulse")} />
            <span>Modo Fluente {settings.fluentMode ? 'Ativado' : 'Desativado'}</span>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-all ml-1",
              settings.fluentMode ? "bg-purple-500" : "bg-slate-300 dark:bg-zinc-700"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                settings.fluentMode ? "left-4.5" : "left-0.5"
              )} />
            </div>
          </button>
        </div>
      )}

      {/* 2. MEIO: Caixa de texto */}
      <div className="space-y-4">
        <div className="relative group shadow-sm">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Ouvindo... fale agora" : "Digite o texto para traduzir..."}
            className={cn(
              "w-full h-[220px] p-7 rounded-[32px] bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-white/10 focus:border-[#7B3FE4] focus:ring-4 focus:ring-[#7B3FE4]/5 transition-all duration-300 resize-none text-xl placeholder:text-slate-400 outline-none leading-relaxed text-[var(--text-main)]",
              isListening && "border-[#7B3FE4] ring-4 ring-[#7B3FE4]/10 shadow-[0_0_30px_rgba(123,63,228,0.1)] lg:shadow-[0_0_50px_rgba(123,63,228,0.1)]"
            )}
          />

          {/* OCR Processing Overlay */}
          <AnimatePresence>
            {isProcessingOCR && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 rounded-[32px] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-8 border-2 border-[#7B3FE4]/20"
              >
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-[#7B3FE4] animate-spin" strokeWidth={1.5} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-[#7B3FE4]">{ocrProgress}%</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="text-sm font-black uppercase tracking-[3px] text-slate-800 dark:text-white">{ocrStatus}</span>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-[200px]">
                    {ocrProgress < 100 ? 'Extraindo texto para tradução...' : 'Quase pronto...'}
                  </p>
                </div>
                
                {/* Mini progress bar */}
                <div className="w-48 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#7B3FE4] to-[#3F8EFC]"
                    initial={{ width: 0 }}
                    animate={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="absolute top-5 right-7 flex flex-col items-end gap-1 opacity-40">
            <span className="text-[9px] font-black uppercase tracking-widest">{inputText.length}</span>
            <div className="w-8 h-0.5 bg-slate-200 dark:bg-zinc-700 rounded-full overflow-hidden">
               <div className="h-full bg-[#7B3FE4] transition-all" style={{ width: `${Math.min(100, (inputText.length/500)*100)}%` }} />
            </div>
          </div>

          {/* Listening Indicator */}
          {isListening && (
            <div className="absolute top-5 left-7 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">Gravando Áudio</span>
            </div>
          )}

          <div className="absolute bottom-6 right-6 flex items-center gap-3">
            <button 
              onClick={handlePaste}
              className="p-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4] rounded-2xl hover:scale-105 active:scale-95 transition-all border border-slate-200 dark:border-white/10 shadow-sm"
              title="Colar texto"
            >
              <ClipboardList size={20} />
            </button>

            {inputText && (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => speak(inputText, fromLang)}
                  className={cn(
                    "p-3.5 rounded-2xl transition-all shadow-sm active:scale-90",
                    isSpeaking ? "bg-[#7B3FE4] text-white animate-pulse" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4] border border-slate-200 dark:border-white/10"
                  )}
                  title="Ouvir texto original"
                >
                  <Volume2 size={20} />
                </button>
                <button 
                  onClick={handleClear}
                  className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl hover:scale-105 active:scale-95 transition-all border border-red-500/10"
                  title="Limpar"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 3. ABAIXO DA CAIXA: Câmera e Galeria */}
        <div className="flex items-center justify-center gap-4">
          <button 
            onClick={() => cameraInputRef.current?.click()}
            className="flex-1 h-16 rounded-3xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-[#7B3FE4] hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-3 transition-all active:scale-[0.98] font-bold text-sm shadow-sm"
          >
            <Camera size={20} />
            <span>Câmera</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 h-16 rounded-3xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/5 text-slate-500 hover:text-[#7B3FE4] hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-3 transition-all active:scale-[0.98] font-bold text-sm shadow-sm"
          >
            <ImageIcon size={20} />
            <span>Galeria</span>
          </button>
        </div>
      </div>

      {/* 4. PARTE INFERIOR: Traduzir */}
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className={cn(
            "primary-btn flex-1 h-16 flex items-center justify-center gap-3 text-lg shadow-2xl relative overflow-hidden active:scale-[0.97] transition-all rounded-3xl",
            (isLoading || !inputText.trim()) && "brightness-90 saturate-50 opacity-60"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="font-bold uppercase tracking-widest text-sm">Processando...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Sparkles size={22} className="text-yellow-200" />
              <span className="font-black uppercase tracking-[2px] text-sm">Traduzir com IA</span>
            </div>
          )}
          
          {/* Subtle reflection effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Resultado */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <TranslationSkeleton key="skeleton" />
          ) : translatedText ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-[40px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 relative group min-h-[220px] flex flex-col justify-between shadow-2xl shadow-purple-500/5 transition-all"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                   <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black uppercase tracking-[3px] text-[#3F8EFC] opacity-70">Resultado IA</span>
                    <span className="text-xs font-bold">{LANGUAGES.find(l => l.code === toLang)?.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => speak(translatedText, toLang)}
                      className={cn(
                        "p-3 rounded-2xl transition-all shadow-sm active:scale-90",
                        isSpeaking ? "bg-[#7B3FE4] text-white animate-pulse" : "bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4]"
                      )}
                      title="Ouvir"
                    >
                      <Volume2 size={22} />
                    </button>
                    <button 
                      onClick={handleCopy}
                      className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-500 hover:text-[#7B3FE4] shadow-sm transition-all active:scale-90"
                      title="Copiar"
                    >
                      {copied ? <Check className="text-green-500" size={22} /> : <Copy size={22} />}
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold leading-relaxed text-[var(--text-main)] whitespace-pre-wrap">
                  {translatedText}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100 dark:border-white/5">
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[2px]">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      translationSource === 'server' ? "bg-green-500" : "bg-orange-500"
                    )} />
                    <span>Processado via {settings.engine.toUpperCase()} • {translationSource === 'server' ? 'SEGURO' : 'MODO OFFLINE'}</span>
                 </div>
                 <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">
                   ID: {Math.random().toString(36).substring(7).toUpperCase()}
                 </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TranslationSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-8 rounded-[40px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 min-h-[220px] flex flex-col justify-between shadow-2xl shadow-purple-500/5"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="space-y-2">
            <div className="h-2 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full animate-pulse" />
            <div className="h-3 w-28 bg-slate-200 dark:bg-zinc-700 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-zinc-800 animate-pulse" />
            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-6 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-6 w-[90%] bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-6 w-[40%] bg-slate-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-100 dark:border-white/5">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-2 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full animate-pulse" />
         </div>
      </div>
    </motion.div>
  );
}
