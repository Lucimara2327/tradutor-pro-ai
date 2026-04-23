import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  X, 
  Loader2, 
  Scale,
  MessageSquare,
  Briefcase,
  CheckCircle,
  Zap
} from 'lucide-react';
import { cn } from '../utils';
import { unifiedTranslate } from '../services/translator';
import { AppSettings } from '../types';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeMode, setActiveMode] = useState<string | null>(null);

  const handleAction = async (mode: 'natural' | 'formal' | 'informal' | 'professional' | 'correct') => {
    if (isProcessing || !currentTranslation || !onApplyAdjustment) return;

    setIsProcessing(true);
    setActiveMode(mode);

    try {
      const result = await unifiedTranslate(currentTranslation, fromLang, toLang, {
        ...settings,
        translationStyle: mode,
        isAdjustment: true
      });

      onApplyAdjustment(result.text);
      // Feedback visual rápido antes de fechar ou resetar
      setTimeout(() => {
        setIsProcessing(false);
        setActiveMode(null);
        setIsOpen(false);
      }, 500);
    } catch (error) {
      console.error("Assistant Action Error:", error);
      setIsProcessing(false);
      setActiveMode(null);
    }
  };

  const ACTIONS = [
    { id: 'natural', label: 'Deixar Natural', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'correct', label: 'Corrigir Gramática', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { id: 'formal', label: 'Mais Formal', icon: Scale, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-zinc-800' },
    { id: 'professional', label: 'Profissional', icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'informal', label: 'Mais Informal', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">
      {/* Quick Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[280px] bg-white dark:bg-zinc-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden mb-4 pointer-events-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white">
                  <Zap size={14} />
                </div>
                <span className="text-xs font-bold">Ações Rápidas IA</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-full transition-all text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Actions Grid */}
            <div className="p-3 grid grid-cols-1 gap-2">
              {!currentTranslation ? (
                <div className="py-8 px-4 text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Traduza algo primeiro</p>
                </div>
              ) : (
                ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    disabled={isProcessing}
                    onClick={() => handleAction(action.id as any)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10 group",
                      action.bg,
                      isProcessing && activeMode === action.id ? "ring-2 ring-purple-500" : ""
                    )}
                  >
                    <div className={cn("p-2 rounded-xl bg-white dark:bg-zinc-900 shadow-sm transition-transform group-hover:scale-110", action.color)}>
                      {isProcessing && activeMode === action.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <action.icon size={16} />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">{action.label}</p>
                      <p className="text-[8px] text-slate-400 font-medium uppercase tracking-tighter">Ajuste instantâneo</p>
                    </div>
                  </button>
                ))
              )}
            </div>
            
            <div className="px-4 py-3 bg-slate-50/50 dark:bg-zinc-800/20 text-center border-t border-slate-100 dark:border-white/5">
              <p className="text-[8px] font-black uppercase tracking-[2px] text-slate-400">Powered by Lumi Intelligence</p>
            </div>
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
                key="zap"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center justify-center"
              >
                <Zap size={26} className="fill-current animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};
