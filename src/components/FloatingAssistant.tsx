import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  ArrowRight,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '../utils';
import { classifyAdjustmentMode, unifiedTranslate } from '../services/translator';
import { AppSettings } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isInitial?: boolean;
}

interface FloatingAssistantProps {
  currentTranslation: string;
  fromLang: string;
  toLang: string;
  settings: AppSettings;
  onApplyAdjustment?: (newText: string) => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  currentTranslation,
  fromLang,
  toLang,
  settings,
  onApplyAdjustment
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: 'Olá! Sou o assistente do Lumi. Posso ajudar a ajustar sua tradução. Como prefere o texto?',
      isInitial: true 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping || !currentTranslation) return;

    const userText = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsTyping(true);

    try {
      // 1. Classifica a intenção do usuário
      const mode = await classifyAdjustmentMode(userText, settings.geminiApiKey);
      
      // 2. Executa a tradução/ajuste usando o motor unificado
      const result = await unifiedTranslate(currentTranslation, fromLang, toLang, {
        ...settings,
        translationStyle: mode,
        isAdjustment: true
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: result.text 
      }]);
    } catch (error) {
      console.error("Assistant Chat Error:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, tive um problema ao processar seu pedido. Tente novamente.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {/* Mini Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[320px] sm:w-[380px] h-[450px] bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden mb-4 pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Assistente Inteligente</h3>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">Refinando sua tradução</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-all text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex gap-2 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                    msg.role === 'user' ? "bg-blue-500" : "bg-purple-500"
                  )}>
                    {msg.role === 'user' ? <User size={12} className="text-white" /> : <Bot size={12} className="text-white" />}
                  </div>
                  <div className="space-y-2">
                    <div className={cn(
                      "p-3 rounded-2xl text-xs leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-blue-500 text-white rounded-tr-none" 
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-tl-none border border-slate-200 dark:border-white/5"
                    )}>
                      {msg.content}
                    </div>
                    {msg.role === 'assistant' && !msg.isInitial && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleCopy(msg.content, i)}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-purple-500 transition-all"
                        >
                          {copiedIndex === i ? <Check size={10} /> : <Copy size={10} />}
                          {copiedIndex === i ? 'Copiado' : 'Copiar'}
                        </button>
                        {onApplyAdjustment && (
                          <button 
                            onClick={() => {
                              onApplyAdjustment(msg.content);
                              setIsOpen(false);
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-green-500 transition-all"
                          >
                            <RefreshCw size={10} />
                            Aplicar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex gap-2 mr-auto max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot size={12} className="text-white" />
                  </div>
                  <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-white/5">
                    <Loader2 size={12} className="animate-spin text-purple-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form 
              onSubmit={handleSend}
              className="p-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-white/5"
            >
              {!currentTranslation ? (
                <div className="text-[10px] text-center text-slate-400 font-medium py-2">
                  Traduza algo primeiro para usar o assistente
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Peça um ajuste (ex: 'Deixe formal')..."
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-4 pr-12 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all disabled:opacity-50"
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 transition-all shadow-lg shadow-purple-500/20"
                  >
                    <Send size={14} />
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <div className="relative group pointer-events-auto">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all relative overflow-hidden",
            isOpen 
              ? "bg-slate-800 dark:bg-zinc-800 text-white" 
              : "bg-gradient-to-tr from-purple-600 to-blue-500 text-white shadow-purple-500/20"
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ opacity: 0, rotate: -90 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 90 }}
              >
                <X size={26} />
              </motion.div>
            ) : (
              <motion.div
                key="sparkles"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center justify-center"
              >
                <Sparkles size={26} className="animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        
        {/* Tooltip hint on hover (only on desktop) */}
        <div className="absolute right-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-[10px] text-white font-bold uppercase tracking-wider rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden lg:block whitespace-nowrap">
          Assistente IA
        </div>
      </div>
    </div>
  );
};
