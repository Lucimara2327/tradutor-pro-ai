
import React, { useState } from 'react';
import { Star, Trash2, Volume2, Copy, Check, ArrowLeftRight } from 'lucide-react';
import { Translation } from '@/src/types';
import { LANGUAGES } from '@/src/constants';
import { cn } from '@/src/utils';
import { motion } from 'motion/react';

interface TranslationItemProps {
  key?: React.Key;
  translation: Translation;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onSpeak: (text: string, lang: string) => void;
}

export default function TranslationItem({ 
  translation, 
  onToggleFavorite, 
  onDelete,
  onSpeak 
}: TranslationItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(translation.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLangName = (code: string) => {
    return LANGUAGES.find(l => l.code === code)?.name || code;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-5 rounded-3xl glass-card flex flex-col gap-4 group shadow-sm bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-white/5 active:scale-[0.98] transition-all"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3 text-[10px] uppercase font-black tracking-[2px] opacity-60">
            <span className="text-[#7B3FE4]">{getLangName(translation.fromLang)}</span>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <span className="text-[#3F8EFC]">{getLangName(translation.toLang)}</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">"{translation.originalText}"</p>
          <p className="text-lg font-bold text-[var(--text-main)] mt-1">{translation.translatedText}</p>
        </div>
        
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => onToggleFavorite(translation.id)}
            className={cn(
              "p-3 rounded-2xl transition-all shadow-sm active:scale-90",
              translation.isFavorite ? "text-yellow-500 bg-yellow-500/10" : "bg-slate-50 dark:bg-zinc-800 text-slate-400"
            )}
          >
            <Star size={20} fill={translation.isFavorite ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={() => onDelete(translation.id)}
            className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-2xl active:scale-90 transition-all shadow-sm"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-100 dark:border-white/5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {new Date(translation.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
        
        <div className="flex gap-3">
          <button 
            onClick={handleCopy}
            className="p-2.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4] rounded-xl transition-all active:scale-90"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
          <button 
            onClick={() => onSpeak(translation.translatedText, translation.toLang)}
            className="p-2.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:text-[#7B3FE4] rounded-xl transition-all active:scale-90"
          >
            <Volume2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
