
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
  ClipboardList,
  Pause,
  Play,
  Square,
  MessageSquare,
  Scale,
  Briefcase,
  CheckCircle,
  Wand2,
  Zap,
  Send,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LANGUAGES } from '@/src/constants';
import { AppSettings, Translation } from '@/src/types';
import { unifiedTranslate, unifiedSpeak, detectLanguage, isOpenAIAvailable, classifyAdjustmentMode, validateTranslationQuality } from '@/src/services/translator';
import { cn, splitLongText } from '@/src/utils';
import { FloatingAssistant } from '@/src/components/FloatingAssistant';

interface TranslatorProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addTranslation: (t: Translation) => void;
}

const AudioControls = ({ 
  state, 
  onPlay, 
  onPause, 
  onResume, 
  onStop,
  variant = 'default' 
}: { 
  state: 'idle' | 'playing' | 'paused' | 'loading';
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  variant?: 'default' | 'minimal';
}) => {
  if (state === 'loading') {
    return (
      <button className="p-3.5 bg-slate-100 dark:bg-zinc-800 text-[#7B3FE4] rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm animate-pulse">
        <Loader2 size={20} className="animate-spin" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {state === 'playing' ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={onPause}
            className="p-3.5 bg-[#7B3FE4] text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Pausar"
          >
            <Pause size={20} />
          </button>
          {variant === 'default' && (
            <button 
              onClick={onStop}
              className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl hover:scale-105 active:scale-95 transition-all border border-red-500/10"
              title="Parar"
            >
              <Square size={20} fill="currentColor" />
            </button>
          )}
        </div>
      ) : state === 'paused' ? (
        <div className="flex items-center gap-2">
          <button 
            onClick={onResume}
            className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
            title="Retomar"
          >
            <Play size={20} fill="currentColor" />
          </button>
          <button 
            onClick={onStop}
            className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl hover:scale-105 active:scale-95 transition-all border border-red-500/10"
            title="Parar"
          >
            <Square size={20} fill="currentColor" />
          </button>
        </div>
      ) : (
        <button 
          onClick={onPlay}
          className={cn(
            "p-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4] rounded-2xl hover:scale-105 active:scale-95 transition-all border border-slate-200 dark:border-white/10 shadow-sm",
            variant === 'minimal' && "p-2 rounded-xl"
          )}
          title="Ouvir"
        >
          <Volume2 size={variant === 'minimal' ? 18 : 20} />
        </button>
      )}

    </div>
  );
};

export default function Translator({ settings, setSettings, addTranslation }: TranslatorProps) {
  const [inputText, setInputText] = useState(() => localStorage.getItem('translator_inputText') || '');
  const [translatedText, setTranslatedText] = useState(() => localStorage.getItem('translator_translatedText') || '');
  
  // Initial state from localStorage for persistence
  const [fromLang, setFromLang] = useState(() => localStorage.getItem('translator_fromLang') || 'auto');
  const [toLang, setToLang] = useState(() => localStorage.getItem('translator_toLang') || 'en');
  
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<{ openai: string; gemini: string } | null>(() => {
    const saved = localStorage.getItem('translator_comparisonResults');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isMagicActive, setIsMagicActive] = useState(false);
  const [magicQuery, setMagicQuery] = useState("");
  const [isClassifying, setIsClassifying] = useState(false);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused' | 'loading'>('idle');
  const [ttsFeedback, setTtsFeedback] = useState<string | null>(null);
  const [translationSource, setTranslationSource] = useState<'server' | 'client' | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [detectedSuggestion, setDetectedSuggestion] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isValidatingQuality, setIsValidatingQuality] = useState(false);
  const [isQualityIssue, setIsQualityIssue] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean; id: number } | null>(null);

  const ttsTimeoutRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string) => {
    const id = Date.now();
    setToast({ message, visible: true, id });
    
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(prev => prev?.id === id ? { ...prev, visible: false } : prev);
    }, 3500);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSpeechIdRef = useRef<number>(0);
  const currentRequestIdRef = useRef(0);

  const stopGeminiAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Source might already be stopped
      }
      currentAudioSourceRef.current = null;
    }
    setAudioState('idle');
    setIsSpeaking(false);
  };

  useEffect(() => {
    const handleRemoteCamera = () => cameraInputRef.current?.click();
    const handleRemoteGallery = () => fileInputRef.current?.click();

    window.addEventListener('lumi:open-camera', handleRemoteCamera);
    window.addEventListener('lumi:open-gallery', handleRemoteGallery);

    return () => {
      window.removeEventListener('lumi:open-camera', handleRemoteCamera);
      window.removeEventListener('lumi:open-gallery', handleRemoteGallery);
    };
  }, []);

  const handleAudioControl = async (action: 'play' | 'pause' | 'resume' | 'stop' | 'speed', text?: string, lang?: string, newSpeed?: number) => {
    switch (action) {
      case 'play':
        if (text && lang) {
          speak(text, lang);
        }
        break;
      case 'pause':
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          await audioContextRef.current.suspend();
          setAudioState('paused');
        } else if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          setAudioState('paused');
        }
        break;
      case 'resume':
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          setAudioState('playing');
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
          setAudioState('playing');
        }
        break;
      case 'stop':
        window.speechSynthesis.cancel();
        stopGeminiAudio();
        break;
      case 'speed':
        if (newSpeed) {
          setSettings(prev => ({ ...prev, audioSpeed: newSpeed }));
          // If already playing Gemini audio, update playback rate live
          if (currentAudioSourceRef.current) {
            currentAudioSourceRef.current.playbackRate.value = newSpeed;
          }
        }
        break;
    }
  };

  const speak = async (text: string, langCode: string) => {
    if (!navigator.onLine) {
      setError("Sem conexão com a internet. Verifique sua rede.");
      return;
    }
    // 1. Cancel everything immediately
    window.speechSynthesis.cancel();
    stopGeminiAudio();
    if (!text) return;

    // 2. Track this request
    const speechId = ++currentSpeechIdRef.current;
    setIsSpeaking(true);
    setAudioState('loading');
    setTtsFeedback("🧠 Ajustando fluência...");

    const feedbackTimer = setTimeout(() => {
      if (speechId === currentSpeechIdRef.current) {
        setTtsFeedback("🔊 Preparando áudio...");
      }
    }, 1000);

    try {
      // 3. Try high-quality Gemini TTS (async fetch)
      const base64Data = await unifiedSpeak(text, settings);
      
      // 4. Critical check: did someone request a different audio while we were fetching?
      if (speechId !== currentSpeechIdRef.current) {
        clearTimeout(feedbackTimer);
        setTtsFeedback(null);
        console.log('Aborting play: newer speech request detected');
        return;
      }

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // Ensure context is running if it was suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
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
      source.playbackRate.value = settings.audioSpeed;
      
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 0.7;
      
      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        if (speechId === currentSpeechIdRef.current) {
            setIsSpeaking(false);
            setAudioState('idle');
            setTtsFeedback(null);
            currentAudioSourceRef.current = null;
        }
      };
      
      currentAudioSourceRef.current = source;
      source.start();
      clearTimeout(feedbackTimer);
      setTtsFeedback(null);
      setAudioState('playing');

    } catch (error) {
      clearTimeout(feedbackTimer);
      if (speechId !== currentSpeechIdRef.current) return;

      console.warn('Gemini TTS failed, falling back to system TTS', error);
      
      // Feedback indicating fallback
      setTtsFeedback("🔊 Preparando voz...");
      
      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = langCode === 'auto' ? 'pt-BR' : langCode;
      utterance.lang = targetLang;
      utterance.volume = 0.7;
      utterance.rate = settings.audioSpeed;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferredVoice = voices.find(v => 
          v.lang.startsWith(targetLang) && 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium'))
        ) || voices.find(v => v.lang.startsWith(targetLang));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        if (speechId === currentSpeechIdRef.current) {
          setIsSpeaking(true);
          setAudioState('playing');
          setTtsFeedback(null);
        }
      };
      utterance.onend = () => {
        if (speechId === currentSpeechIdRef.current) {
          setIsSpeaking(false);
          setAudioState('idle');
          setTtsFeedback(null);
        }
      };
      utterance.onerror = () => {
        if (speechId === currentSpeechIdRef.current) {
          setIsSpeaking(false);
          setAudioState('idle');
          setTtsFeedback("Erro ao gerar áudio");
          setTimeout(() => {
            if (speechId === currentSpeechIdRef.current) {
              setTtsFeedback(null);
            }
          }, 2000);
        }
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleTranslate = async (adjustmentStyle?: string) => {
    if (!inputText.trim()) return;

    if (!navigator.onLine) {
      setError("Sem conexão com a internet. Verifique sua rede.");
      return;
    }

    // Permitir idiomas iguais se for um ajuste de texto (Assistant mode)
    const isAdjustment = !!adjustmentStyle || (fromLang !== 'auto' && fromLang === toLang);
    
    if (!isAdjustment && fromLang !== 'auto' && fromLang === toLang) {
      setError("Selecione idiomas diferentes para traduzir");
      return;
    }
    
    const targetStyle = adjustmentStyle || settings.translationStyle;
    const isRefining = !!adjustmentStyle;
    
    if (isRefining) {
      setIsPolishing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setIsOutdated(false);
    
    if (!isRefining) {
      setTranslatedText("");
      setComparisonResults(null);
    }
    
    const requestId = ++currentRequestIdRef.current;
    
    window.speechSynthesis.cancel();
    stopGeminiAudio();

    try {
      const chunks = splitLongText(inputText, 400);

      // Rule 1 & 3: Sequential fallback handled inside unifiedTranslate
      const chunkPromises = chunks.map(chunk => 
        unifiedTranslate(chunk, fromLang, toLang, { 
          ...settings, 
          translationStyle: targetStyle as any,
          isAdjustment
        })
      );

      const results = await Promise.all(chunkPromises);

      if (requestId !== currentRequestIdRef.current) return;

      const combinedText = results.map(r => r.text).join(' ');
      const finalSource = results[0]?.source || 'server';

      setTranslatedText(combinedText);
      setTranslationSource(finalSource);
      
      // Qualidade IA Check
      setIsValidatingQuality(true);
      setIsQualityIssue(false);
      try {
        const isFine = await validateTranslationQuality(inputText, combinedText, settings.geminiApiKey);
        if (!isFine) {
          setIsQualityIssue(true);
          console.warn('[QUALITY_ALERT] Tradução sinalizada como potencialmente inconsistente.');
        }
      } catch (e) {
        console.error("Quality check fail:", e);
      } finally {
        setIsValidatingQuality(false);
      }
      
      const newTranslation: Translation = {
        id: crypto.randomUUID(),
        originalText: inputText,
        translatedText: combinedText,
        fromLang,
        toLang,
        timestamp: Date.now(),
        isFavorite: false,
      };
      
      addTranslation(newTranslation);

      if (settings.autoPlayAudio) {
        speak(combinedText, toLang);
      }
    } catch (err: any) {
      if (requestId !== currentRequestIdRef.current) return;
      setError(err.message || "Não foi possível traduzir agora. Tente novamente.");
      console.warn('[DEVELOPER_LOG] Translation process handled an exception:', err);
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false);
        setIsPolishing(false);
      }
    }
  };

  const handleSwap = () => {
    if (fromLang === 'auto') return;

    if (fromLang === toLang) {
      const suggestion = fromLang === 'pt' ? 'en' : 'pt';
      setFromLang(suggestion);
      setError(null);
      return;
    }

    const temp = fromLang;
    setFromLang(toLang);
    setToLang(temp);
    setInputText(translatedText);
    setTranslatedText(inputText);
    setError(null);
  };

  const handleMagicCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicQuery.trim() || isClassifying || !translatedText) return;

    setIsClassifying(true);
    try {
      const mode = await classifyAdjustmentMode(magicQuery, settings.geminiApiKey);
      setMagicQuery("");
      setIsMagicActive(false);
      handleTranslate(mode);
    } catch (error) {
      console.error("Magic fail:", error);
    } finally {
      setIsClassifying(false);
    }
  };

  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    setComparisonResults(null);
    localStorage.removeItem('translator_inputText');
    localStorage.removeItem('translator_translatedText');
    localStorage.removeItem('translator_comparisonResults');
    setError(null);
    setIsSpeaking(false);
    setIsListening(false);
    setAudioState('idle');
    window.speechSynthesis.cancel();
    stopGeminiAudio();
    recognitionRef.current?.stop();
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

  // Persistence effect
  useEffect(() => {
    localStorage.setItem('translator_fromLang', fromLang);
    localStorage.setItem('translator_toLang', toLang);
    localStorage.setItem('translator_inputText', inputText);
    localStorage.setItem('translator_translatedText', translatedText);
    if (comparisonResults) {
      localStorage.setItem('translator_comparisonResults', JSON.stringify(comparisonResults));
    } else {
      localStorage.removeItem('translator_comparisonResults');
    }
  }, [fromLang, toLang, inputText, translatedText, comparisonResults]);

  // Language detection effect
  useEffect(() => {
    if (inputText.trim().length < 10) {
      setDetectedSuggestion(null);
      return;
    }

    const timer = setTimeout(async () => {
      // Don't detect if auto is already selected
      if (fromLang === 'auto') return;

      setIsDetecting(true);
      try {
        const detected = await detectLanguage(inputText, settings);
        
        // Rule 3: Se detectar que o texto está no mesmo idioma do destino: Ajustar automaticamente o idioma de origem
        if (detected && detected === toLang && detected !== fromLang) {
          // Auto-adjusting source language to match detected
          setFromLang(detected);
          setError(null);
          setDetectedSuggestion(null);
        } else {
          setDetectedSuggestion(null);
        }
      } catch (err) {
        console.warn('Auto-detect failed silent');
      } finally {
        setIsDetecting(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [inputText, fromLang, toLang, settings]);

  useEffect(() => {
    // Stop all audio on unmount or visibility change (background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        window.speechSynthesis.cancel();
        stopGeminiAudio();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.speechSynthesis.cancel();
      stopGeminiAudio();
    };
  }, []);

  // Clear translation if input is empty
  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText('');
      setComparisonResults(null);
    }
  }, [inputText]);

  // Language Change Effect - Still automatic
  useEffect(() => {
    if (!inputText.trim() || isProcessingOCR) return;
    const timer = setTimeout(() => {
      handleTranslate();
    }, 400);
    return () => clearTimeout(timer);
  }, [fromLang, toLang]);

  // Style Change Effect - Now triggers a toast
  useEffect(() => {
    if (inputText.trim() && translatedText) {
      setIsOutdated(true);
      showToast("✨ Estilo alterado — clique em 'Traduzir com IA' para atualizar");
    }
  }, [settings.translationStyle]);

  // Monitor OpenAI Availability for Toast
  useEffect(() => {
    if (!isOpenAIAvailable()) {
      showToast("⚠️ Serviço alternativo em uso para garantir funcionamento");
    }
  }, [isOpenAIAvailable()]);

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
    <div className="relative animate-in fade-in duration-700 pb-10 overflow-x-hidden px-1 pt-2 lg:pt-4">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast?.visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-6 left-1/2 z-[110] px-6 py-3 rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-slate-200 dark:border-white/10 flex items-center gap-3 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90 max-w-[90vw] w-fit pointer-events-auto"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {toast.message.includes('⚠️') ? <AlertCircle size={18} /> : <Sparkles size={18} />}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 leading-tight">
              {toast.message.replace(/^[^\s]+\s/, '')}
            </p>
            <button 
              onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)}
              className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 px-1">

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
              onChange={(e) => {
                const val = e.target.value;
                setFromLang(val);
                if (val !== 'auto' && val === toLang) {
                  setError("Selecione idiomas diferentes para traduzir");
                } else {
                  setError(null);
                }
              }}
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
              onChange={(e) => {
                const val = e.target.value;
                setToLang(val);
                if (fromLang !== 'auto' && fromLang === val) {
                  setError("Selecione idiomas diferentes para traduzir");
                } else {
                  setError(null);
                }
              }}
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
    
      {/* Erro amigável */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold uppercase tracking-widest justify-center"
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MEIO: Caixa de texto */}
      <div className="space-y-4">
        <AnimatePresence>
          {detectedSuggestion && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-2 mb-2 p-2 px-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>Idioma detectado: {LANGUAGES.find(l => l.code === detectedSuggestion)?.name}</span>
                </div>
                <button 
                  onClick={()=>{
                    handleSwap();
                    setDetectedSuggestion(null);
                  }}
                  className="bg-amber-500 text-white px-3 py-1 rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Inverter Idiomas
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <AudioControls 
                  state={audioState}
                  onPlay={() => handleAudioControl('play', inputText, fromLang)}
                  onPause={() => handleAudioControl('pause')}
                  onResume={() => handleAudioControl('resume')}
                  onStop={() => handleAudioControl('stop')}
                />
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
      </div>
      <div className="flex items-center gap-3 pt-4">
        <button
          onClick={() => handleTranslate()}
          disabled={isLoading || !inputText.trim()}
          className={cn(
            "primary-btn flex-1 h-16 flex items-center justify-center gap-3 text-lg shadow-2xl relative overflow-hidden active:scale-[0.97] transition-all rounded-3xl",
            (isLoading || !inputText.trim()) && "brightness-90 saturate-50 opacity-60"
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="font-bold uppercase tracking-widest text-sm">Traduzindo...</span>
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
            <TranslationSkeleton key="skeleton" comparisonMode={settings.comparisonMode} />
          ) : settings.comparisonMode && comparisonResults ? (
            <div key="comparison" className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-5 duration-500">
              <ComparisonCard 
                engine="openai" 
                text={comparisonResults.openai} 
                audioState={audioState}
                onAudioControl={handleAudioControl}
                onCopy={() => {
                  navigator.clipboard.writeText(comparisonResults.openai);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                isCopied={copied}
                toLang={toLang}
              />
              <ComparisonCard 
                engine="gemini" 
                text={comparisonResults.gemini} 
                audioState={audioState}
                onAudioControl={handleAudioControl}
                onCopy={() => {
                  navigator.clipboard.writeText(comparisonResults.gemini);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                isCopied={copied}
                toLang={toLang}
              />
            </div>
          ) : translatedText ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-[40px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 relative group min-h-[220px] flex flex-col justify-between shadow-2xl shadow-purple-500/5 transition-all"
            >
              <div className="space-y-6">
                <AnimatePresence>
                  {isMagicActive && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      onSubmit={handleMagicCommand}
                      className="overflow-hidden"
                    >
                      <div className="relative group/input">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500">
                          <Zap size={14} className={cn(isClassifying && "animate-pulse")} />
                        </div>
                        <input 
                          autoFocus
                          value={magicQuery}
                          onChange={(e) => setMagicQuery(e.target.value)}
                          placeholder="Ex: Deixe mais profissional..."
                          className="w-full bg-slate-50 dark:bg-zinc-800/50 border border-purple-500/20 rounded-2xl py-3 pl-10 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                          disabled={isClassifying}
                        />
                        <button 
                          type="submit"
                          disabled={!magicQuery.trim() || isClassifying}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-all"
                        >
                          {isClassifying ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                   <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black uppercase tracking-[3px] text-[#3F8EFC] opacity-70">Resultado IA</span>
                      <span className="text-xs font-bold">{LANGUAGES.find(l => l.code === toLang)?.name}</span>
                    </div>

                    {/* Badge de Qualidade */}
                    <AnimatePresence>
                      {isValidatingQuality ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded-full border border-slate-200 dark:border-white/5"
                        >
                          <Loader2 size={10} className="animate-spin text-slate-400" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500">Auditoria IA...</span>
                        </motion.div>
                      ) : isQualityIssue ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-full border border-amber-200 dark:border-amber-900/30"
                        >
                          <ShieldAlert size={10} className="text-amber-500" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Verificar Conteúdo</span>
                        </motion.div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-900/30"
                        >
                          <ShieldCheck size={10} className="text-green-500" />
                          <span className="text-[8px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Auditado</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {/* Comando Mágico Toggle */}
                    <button 
                      onClick={() => setIsMagicActive(!isMagicActive)}
                      className={cn(
                        "p-2 rounded-xl transition-all border",
                        isMagicActive 
                          ? "bg-purple-500 text-white border-purple-600 shadow-lg shadow-purple-500/20" 
                          : "bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:text-purple-500 border-slate-200 dark:border-white/5"
                      )}
                      title="Comando Mágico IA"
                    >
                      <Wand2 size={14} />
                    </button>

                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1 self-center" />

                    {/* Botões do Assistente Inteligente */}
                    {[
                      { id: 'fluent', label: 'Natural', icon: <Sparkles size={12} className="text-purple-500" />, title: 'Tornar mais fluente' },
                      { id: 'informal', label: 'Informal', icon: <MessageSquare size={12} className="text-blue-500" />, title: 'Linguagem casual' },
                      { id: 'formal', label: 'Formal', icon: <Scale size={12} className="text-amber-500" />, title: 'Linguagem educada' },
                      { id: 'professional', label: 'Pro', icon: <Briefcase size={12} className="text-slate-500" />, title: 'Linguagem técnica' },
                      { id: 'correct', label: 'Corrigir', icon: <CheckCircle size={12} className="text-green-500" />, title: 'Corrigir gramática' }
                    ].map((mode) => (
                      <button 
                        key={mode.id}
                        onClick={() => handleTranslate(mode.id)}
                        disabled={isPolishing || isLoading}
                        className={cn(
                          "px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-[1.5px] transition-all flex items-center gap-1.5 border border-slate-200 dark:border-white/5",
                          isPolishing && "opacity-50 pointer-events-none"
                        )}
                        title={mode.title}
                      >
                        {isPolishing ? <Loader2 size={12} className="animate-spin" /> : mode.icon}
                        <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    ))}

                    <div className="w-px h-6 bg-slate-200 dark:bg-zinc-800 mx-1 self-center" />
                    
                    <AudioControls 
                      state={audioState}
                      onPlay={() => handleAudioControl('play', translatedText, toLang)}
                      onPause={() => handleAudioControl('pause')}
                      onResume={() => handleAudioControl('resume')}
                      onStop={() => handleAudioControl('stop')}
                      variant="minimal"
                    />
                    <button 
                      onClick={handleCopy}
                      className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-slate-500 hover:text-[#7B3FE4] shadow-sm transition-all active:scale-90 border border-slate-200 dark:border-white/5"
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
                    <span>Processado via {settings.engine.toUpperCase()} ({settings.model}) • {translationSource === 'server' ? 'SEGURO' : 'MODO OFFLINE'}</span>
                 </div>
                 <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">
                   ID: {Math.random().toString(36).substring(7).toUpperCase()}
                 </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      {/* TTS Feedback Popup */}
      <AnimatePresence>
        {ttsFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-2.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md shadow-2xl border border-slate-200 dark:border-white/10 flex items-center gap-3 pointer-events-none"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#7B3FE4]/10 text-[#7B3FE4]">
              <Volume2 size={14} className="animate-pulse" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 whitespace-nowrap">
              {ttsFeedback}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingAssistant 
        currentTranslation={translatedText}
        fromLang={fromLang}
        toLang={toLang}
        settings={settings}
        onApplyAdjustment={(newText) => {
          setTranslatedText(newText);
          showToast("Ajuste aplicado!");
        }}
      />
    </div>
  </div>
);
}

function ComparisonCard({ engine, text, onSpeak, audioState, onAudioControl, isCopied, onCopy, toLang }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 flex flex-col justify-between shadow-xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex flex-col gap-0.5">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[2px]",
              engine === 'openai' ? "text-[#7B3FE4]" : "text-[#3F8EFC]"
            )}>
              Resultado {engine === 'openai' ? 'OpenAI' : 'Gemini'}
            </span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">
              {LANGUAGES.find(l => l.code === toLang)?.name}
            </span>
          </div>
          <div className="flex gap-2">
            <AudioControls 
              state={audioState}
              onPlay={() => onAudioControl('play', text, toLang)}
              onPause={() => onAudioControl('pause')}
              onResume={() => onAudioControl('resume')}
              onStop={() => onAudioControl('stop')}
              variant="minimal"
            />
            <button 
              onClick={onCopy}
              className="p-2.5 bg-slate-50 dark:bg-zinc-800 rounded-xl text-slate-500 hover:text-[#7B3FE4] transition-all active:scale-90"
            >
              {isCopied ? <Check className="text-green-500" size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
        <p className="text-lg font-bold leading-relaxed text-[var(--text-main)] whitespace-pre-wrap">
          {text}
        </p>
      </div>
    </motion.div>
  );
}

const TranslationSkeleton: React.FC<{ comparisonMode?: boolean }> = ({ comparisonMode }) => {
  if (comparisonMode) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
        {[1, 2].map(i => (
          <div key={i} className="p-6 rounded-[32px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 h-[220px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-2 w-20 bg-slate-100 dark:bg-zinc-800 rounded-full" />
              <div className="h-6 w-full bg-slate-100 dark:bg-zinc-800 rounded-xl" />
              <div className="h-6 w-[80%] bg-slate-100 dark:bg-zinc-800 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }
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
