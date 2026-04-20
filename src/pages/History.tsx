
import { Trash2 } from 'lucide-react';
import { Translation } from '@/src/types';
import TranslationItem from '@/src/components/TranslationItem';
import { motion, AnimatePresence } from 'motion/react';

interface HistoryPageProps {
  history: Translation[];
  toggleFavorite: (id: string) => void;
  deleteTranslation: (id: string) => void;
  clearHistory: () => void;
}

export default function HistoryPage({ 
  history, 
  toggleFavorite, 
  deleteTranslation, 
  clearHistory 
}: HistoryPageProps) {
  
  const handleSpeak = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'auto' ? 'pt-BR' : lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2 lg:px-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
           <h2 className="text-3xl font-black tracking-tight">Histórico</h2>
           {history.length > 0 && (
             <button 
              onClick={clearHistory}
              className="text-[10px] font-black uppercase tracking-[2px] text-red-500 hover:opacity-70 transition-all border border-red-500/20 px-4 py-1.5 rounded-full"
             >
               Limpar Tudo
             </button>
           )}
        </div>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Suas traduções recentes</p>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {history.length === 0 ? (
            <motion.div 
              key="empty-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Trash2 size={32} />
              </div>
              <p className="text-slate-500 dark:text-zinc-500 font-bold uppercase text-[10px] tracking-[4px]">Vazio</p>
            </motion.div>
          ) : (
            history.map(t => (
              <TranslationItem 
                key={t.id} 
                translation={t} 
                onToggleFavorite={toggleFavorite}
                onDelete={deleteTranslation}
                onSpeak={handleSpeak}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
