
import React, { useState, useEffect } from 'react';
import { Key, Moon, Sun, Volume2, ShieldCheck, ExternalLink, Save, CheckCircle2, XCircle, Cpu, Zap, Download } from 'lucide-react';
import { AppSettings } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

interface SettingsPageProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  canInstall?: boolean;
  onInstall?: () => void;
}

export default function SettingsPage({ settings, setSettings, canInstall, onInstall }: SettingsPageProps) {
  const [localKey, setLocalKey] = useState(settings.openaiApiKey);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (settings.openaiApiKey) {
      setIsKeyValid(settings.openaiApiKey.startsWith('sk-') && settings.openaiApiKey.length > 20);
    }
  }, [settings.openaiApiKey]);

  const handleSaveKey = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSettings(prev => ({ ...prev, openaiApiKey: localKey }));
      setSaveStatus('saved');
      setIsKeyValid(localKey.startsWith('sk-') && localKey.length > 20);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto pb-10 px-2 lg:px-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-black tracking-tight">Ajustes</h2>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Configure sua experiência profissional</p>
      </div>

      {/* Engine Selection */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-500 px-2">
          <Cpu size={18} />
          <h3 className="text-[10px] font-black uppercase tracking-[3px]">Motor de Tradução</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              updateSetting('engine', 'gemini');
              updateSetting('model', 'gemini-3-flash-preview');
            }}
            className={cn(
              "p-6 rounded-3xl glass-card flex flex-col gap-4 transition-all duration-300 border bg-white dark:bg-zinc-900/40 relative overflow-hidden",
              settings.engine === 'gemini' 
                ? "border-[#7B3FE4] shadow-lg shadow-purple-500/10 ring-2 ring-[#7B3FE4]/20" 
                : "border-slate-200 dark:border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                settings.engine === 'gemini' ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600" : "bg-slate-100 dark:bg-white/5 text-slate-400"
              )}>
                <Zap size={24} />
              </div>
              {settings.engine === 'gemini' && <CheckCircle2 className="text-purple-500" size={18} />}
            </div>
            <div>
              <span className="text-sm font-black block">Gemini AI</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Gratuito & Rápido</span>
            </div>
          </button>

          <button 
            onClick={() => {
              updateSetting('engine', 'openai');
              updateSetting('model', 'gpt-4o-mini');
            }}
            className={cn(
              "p-6 rounded-3xl glass-card flex flex-col gap-4 transition-all duration-300 border bg-white dark:bg-zinc-900/40 relative overflow-hidden",
              settings.engine === 'openai' 
                ? "border-[#3F8EFC] shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20" 
                : "border-slate-200 dark:border-white/5 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
            )}
          >
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                settings.engine === 'openai' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600" : "bg-slate-100 dark:bg-white/5 text-slate-400"
              )}>
                <Cpu size={24} />
              </div>
              {settings.engine === 'openai' && <CheckCircle2 className="text-blue-500" size={18} />}
            </div>
            <div>
              <span className="text-sm font-black block">OpenAI</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-1">Qualidade Premium</span>
            </div>
          </button>
        </div>
      </section>

      {/* Model Selection */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-500 px-2">
          <Zap size={18} />
          <h3 className="text-[10px] font-black uppercase tracking-[3px]">Modelo Ativo</h3>
        </div>
        <div className="glass-card p-2 bg-white/40 dark:bg-zinc-900/40 border-slate-200 dark:border-white/5 flex gap-1">
          {settings.engine === 'gemini' ? (
            <>
              <button 
                onClick={() => updateSetting('model', 'gemini-3-flash-preview')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  settings.model === 'gemini-3-flash-preview' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                )}
              >
                Gemini 3 Flash
              </button>
              <button 
                onClick={() => updateSetting('model', 'gemini-3.1-pro-preview')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  settings.model === 'gemini-3.1-pro-preview' ? "bg-purple-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                )}
              >
                Gemini 3.1 Pro
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => updateSetting('model', 'gpt-4o-mini')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  settings.model === 'gpt-4o-mini' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                )}
              >
                GPT-4o Mini
              </button>
              <button 
                onClick={() => updateSetting('model', 'gpt-4o')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                  settings.model === 'gpt-4o' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 dark:hover:text-white"
                )}
              >
                GPT-4o Pro
              </button>
            </>
          )}
        </div>
      </section>

      {/* API Key Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Key size={18} />
            <h3 className="text-[10px] font-black uppercase tracking-[3px]">Configuração AI</h3>
          </div>
          <AnimatePresence>
            {isKeyValid !== null && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  isKeyValid ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                )}
              >
                {isKeyValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                <span>{isKeyValid ? 'Conectado' : 'Chave Inválida'}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="glass-card p-6 space-y-5 bg-white/40 dark:bg-zinc-900/40 border-slate-200 dark:border-white/5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Utilizamos a infraestrutura da OpenAI para processar traduções de alta performance. Sua chave sk- permanece segura em seu armazenamento local.
          </p>
          
          <div className="space-y-3">
             <input 
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full h-14 px-5 rounded-2xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 focus:border-[#7B3FE4] outline-none transition-all font-mono text-sm shadow-inner"
            />
            
            <button 
              onClick={handleSaveKey}
              disabled={saveStatus !== 'idle'}
              className={cn(
                "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[2px] transition-all flex items-center justify-center gap-2",
                saveStatus === 'saved' ? "bg-green-500 text-white" : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
              )}
            >
              {saveStatus === 'saving' ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : saveStatus === 'saved' ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Chave Salva</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Salvar Chave API</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-[#7B3FE4]" />
              <span>LocalStorage Ativo</span>
            </div>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-black hover:underline uppercase tracking-widest"
            >
              <span>Get API Key</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-slate-500 px-2">
          <Sun size={18} />
          <h3 className="text-[10px] font-black uppercase tracking-[3px]">Preferências Global</h3>
        </div>
        <div className="glass-card border-slate-200 dark:border-white/5 overflow-hidden bg-white/40 dark:bg-zinc-900/40">
          {/* Theme Toggle */}
          <div className="p-6 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
                {settings.theme === 'light' ? <Sun size={24} /> : <Moon size={24} />}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black">Interface Dark</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alternar Modo Escuro</span>
              </div>
            </div>
            <button 
              onClick={() => updateSetting('theme', settings.theme === 'light' ? 'dark' : 'light')}
              className={cn(
                "w-16 h-8 rounded-full relative transition-all duration-500 shadow-inner",
                settings.theme === 'dark' ? "bg-[#7B3FE4]" : "bg-slate-200 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-xl flex items-center justify-center",
                settings.theme === 'dark' ? "left-9" : "left-1"
              )}>
                 {settings.theme === 'dark' ? <Moon size={12} className="text-purple-600" /> : <Sun size={12} className="text-orange-400" />}
              </div>
            </button>
          </div>

          {/* Auto Audio */}
          <div className="p-6 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                <Volume2 size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black">Audio Auto</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Play Após Tradução</span>
              </div>
            </div>
            <button 
              onClick={() => updateSetting('autoPlayAudio', !settings.autoPlayAudio)}
              className={cn(
                "w-16 h-8 rounded-full relative transition-all duration-500 shadow-inner",
                settings.autoPlayAudio ? "bg-[#3F8EFC]" : "bg-slate-200 dark:bg-white/10"
              )}
            >
              <div className={cn(
                "absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-500 shadow-xl",
                settings.autoPlayAudio ? "left-9" : "left-1"
              )} />
            </button>
          </div>
        </div>
      </section>

      {/* Model Selection */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[3px] text-slate-500 ml-2">Neural Network Engine</h3>
        <div className="grid grid-cols-2 gap-4">
          {['gpt-4o-mini', 'gpt-4o'].map(model => (
            <button
              key={model}
              onClick={() => updateSetting('model', model)}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all font-black text-[10px] tracking-[2px] uppercase",
                settings.model === model 
                  ? "border-[#7B3FE4] bg-[#7B3FE4]/10 text-[#7B3FE4] shadow-lg shadow-purple-500/10" 
                  : "border-slate-100 dark:border-white/5 bg-white/20 dark:bg-zinc-900/40 text-slate-400 hover:border-slate-200 dark:hover:border-white/10"
              )}
            >
              {model}
            </button>
          ))}
        </div>
      </section>

      {/* App Installation */}
      {canInstall && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-500 px-2">
            <Download size={18} />
            <h3 className="text-[10px] font-black uppercase tracking-[3px]">Uso Nativo</h3>
          </div>
          <div className="glass-card p-6 bg-gradient-to-br from-[#7B3FE4] to-[#3F8EFC] text-white border-none shadow-xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="space-y-1">
                <h4 className="text-lg font-black tracking-tight">Tradutor Pro na Tela Inicial</h4>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 decoration-white/30 underline decoration-dashed transition-all">
                  Instale como um app nativo para acesso instantâneo
                </p>
              </div>
              <button 
                onClick={onInstall}
                className="w-full h-14 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[2px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={18} />
                <span>Instalar Aplicativo</span>
              </button>
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
          </div>
        </section>
      )}

      <footer className="pt-10 flex flex-col items-center gap-4">
        <div className="px-6 py-2 rounded-full border border-slate-100 dark:border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-[4px]">
           PRO VERSION • v1.1.0-STABLE
        </div>
      </footer>
    </div>
  );
}
