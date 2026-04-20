
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
import { cn } from '@/src/lib/utils';

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
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-white/5"
          >
            {/* Header Content */}
            <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B3FE4] to-[#3F8EFC] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                  <Languages size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    Tradutor <span className="text-[#7B3FE4]">Pro AI</span>
                    <span className="bg-[#7B3FE4]/10 text-[#7B3FE4] text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest mt-1">v1.0</span>
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status: Em desenvolvimento</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Description */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                  <FileText size={16} />
                  <h3 className="text-xs font-black uppercase tracking-[2px]">Descrição</h3>
                </div>
                <div className="p-6 rounded-[24px] bg-slate-50 dark:bg-zinc-800/20 border border-slate-100 dark:border-white/5">
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                    App de tradução inteligente com suporte a texto e imagens utilizando inteligência artificial. 
                    Desenvolvido com auxílio de ferramentas de IA como ChatGPT e plataformas de criação de apps como AI Studio.
                  </p>
                </div>
              </section>

              {/* Features Grid */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                  <Sparkles size={16} />
                  <h3 className="text-xs font-black uppercase tracking-[2px]">Funcionalidades</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FeatureItem 
                    icon={<Activity className="text-blue-500" size={18} />} 
                    label="Tradução em tempo real" 
                    desc="Processamento instantâneo de texto."
                  />
                  <FeatureItem 
                    icon={<Maximize2 className="text-purple-500" size={18} />} 
                    label="Tradução de imagens (OCR)" 
                    desc="Extração de texto via câmera."
                  />
                  <FeatureItem 
                    icon={<Languages className="text-emerald-500" size={18} />} 
                    label="Múltiplos idiomas" 
                    desc="Suporte global para +50 línguas."
                  />
                  <FeatureItem 
                    icon={<Settings className="text-orange-500" size={18} />} 
                    label="Interface Moderna" 
                    desc="Design responsivo e fluido."
                  />
                </div>
              </section>

              {/* Security */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                  <Shield size={16} />
                  <h3 className="text-xs font-black uppercase tracking-[2px]">Segurança & Privacidade</h3>
                </div>
                <div className="p-6 rounded-[24px] bg-emerald-500/5 dark:bg-emerald-500/[0.03] border border-emerald-500/10 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                    <Shield size={20} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-400">Proteção Local</h4>
                    <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-500/60 leading-relaxed">
                      As chaves de API são armazenadas localmente no dispositivo do usuário. Nenhuma informação sensível é exposta publicamente.
                    </p>
                  </div>
                </div>
              </section>

              {/* Project Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-slate-400 dark:text-zinc-500">
                  <Info size={16} />
                  <h3 className="text-xs font-black uppercase tracking-[2px]">Sobre o projeto</h3>
                </div>
                <div className="p-6 rounded-[24px] bg-slate-50 dark:bg-zinc-800/20 border border-slate-100 dark:border-white/5">
                  <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed font-medium italic">
                    Este aplicativo é um PWA (Progressive Web App) desenvolvido utilizando as mais modernas tecnologias web para garantir uma experiência offline e cross-platform de alta performance.
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-100 dark:border-white/5 text-center">
              <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">Desenvolvido com IA & AI Studio • 2024</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FeatureItem({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-white dark:bg-zinc-900 shadow-sm flex items-start gap-3 hover:border-slate-300 dark:hover:border-white/10 transition-colors group">
      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">{label}</h4>
        <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-500 leading-tight">{desc}</p>
      </div>
    </div>
  );
}
