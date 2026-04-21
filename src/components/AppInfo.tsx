
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Settings, 
  Shield, 
  Activity, 
  FileText, 
  Languages, 
  Sparkles, 
  Maximize2,
  Info
} from 'lucide-react';
import { cn } from '@/src/utils';

interface AppInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppInfo({ isOpen, onClose }: AppInfoProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          {/* Backdrop with blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md"
          />

          {/* Modal with scale and fade animation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] relative overflow-hidden flex flex-col max-h-[85vh] border border-slate-200 dark:border-white/5"
          >
            {/* Header Content */}
            <div className="p-8 pb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Sobre o <span className="gradient-text">Lumi Translate</span>
              </h2>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 pt-0 space-y-8 custom-scrollbar">
              <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
                O Lumi Translate utiliza inteligência artificial para fornecer traduções mais naturais e precisas.
              </p>

              <div className="space-y-6">
                {/* Tech Section */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-[#7B3FE4] flex items-center gap-2">
                    <span>🤖</span> Tecnologias utilizadas
                  </h3>
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-white/5">
                    <p className="text-xs font-bold text-slate-600 dark:text-zinc-400 leading-relaxed">
                      Este aplicativo utiliza APIs de IA de terceiros, incluindo:
                    </p>
                    <ul className="mt-2 space-y-1">
                      <li className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#7B3FE4]" /> OpenAI
                      </li>
                      <li className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-[#3F8EFC]" /> Google AI (Gemini)
                      </li>
                    </ul>
                  </div>
                </section>

                {/* Privacy Section */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-[#3F8EFC] flex items-center gap-2">
                    <span>🔐</span> Privacidade e Dados
                  </h3>
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-white/5 text-xs font-medium text-slate-600 dark:text-zinc-400 leading-relaxed overflow-hidden">
                    <p className="mb-3">Os textos inseridos podem ser enviados para processamento pelas APIs de IA para gerar traduções.</p>
                    <p className="mb-3 font-bold text-slate-900 dark:text-white">Ao utilizar este aplicativo, você concorda com esse processamento.</p>
                    <p className="mb-3">Nenhum dado pessoal é armazenado permanentemente pelo aplicativo.</p>
                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 mt-1">
                      <p className="text-slate-500 dark:text-slate-400 italic">As chaves de API são fornecidas pelo próprio usuário e utilizadas apenas localmente.</p>
                    </div>
                  </div>
                </section>

                {/* Operation Section */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-emerald-500 flex items-center gap-2">
                    <span>📱</span> Funcionamento
                  </h3>
                  <div className="p-5 rounded-3xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-100 dark:border-white/5 text-xs font-medium text-slate-600 dark:text-zinc-400 leading-relaxed">
                    O Lumi Translate funciona como um aplicativo web (PWA), podendo ser instalado no seu dispositivo.
                  </div>
                </section>

                {/* Warning Section */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-[2px] text-orange-500 flex items-center gap-2">
                    <span>⚠️</span> Aviso importante
                  </h3>
                  <div className="p-5 rounded-3xl bg-orange-50 dark:bg-orange-500/5 border border-orange-200/50 dark:border-orange-500/10 text-xs font-bold text-orange-700 dark:text-orange-400 leading-relaxed">
                    Este aplicativo não é afiliado oficialmente à OpenAI ou Google.
                  </div>
                </section>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4">
                <a 
                  href="/privacy.html" 
                  target="_blank"
                  className="w-full h-14 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[2px] hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all"
                >
                  <Shield size={14} className="text-[#3F8EFC]" />
                  <span>Política de Privacidade</span>
                </a>
                <button 
                  onClick={onClose}
                  className="w-full h-14 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-[2px] hover:opacity-90 transition-all shadow-lg active:scale-[0.98]"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-white/5 text-center">
              <span className="text-[9px] font-black uppercase tracking-[3px] text-slate-400">
                Lumi Translate • AI Studio • 2026
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
