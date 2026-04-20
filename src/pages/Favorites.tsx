
import { Star } from 'lucide-react';
import { Translation } from '@/src/types';
import TranslationItem from '@/src/components/TranslationItem';
import { motion, AnimatePresence } from 'motion/react';

interface FavoritesPageProps {
  history: Translation[];
  toggleFavorite: (id: string) => void;
  deleteTranslation: (id: string) => void;
}

export default function FavoritesPage({ history, toggleFavorite, deleteTranslation }: FavoritesPageProps) {
  
  const handleSpeak = (text: string, lang: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'auto' ? 'pt-BR' : lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 px-2 lg:px-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight">Favoritos</h2>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Suas traduções marcadas com estrela</p>
      </div>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {history.length === 0 ? (
            <motion.div 
              key="empty-favorites"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/10 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-300">
                <Star size={32} />
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
