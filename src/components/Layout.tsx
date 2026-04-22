
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Languages, 
  History, 
  Settings, 
  Star, 
  Info, 
  MoreVertical, 
  ChevronUp, 
  ArrowLeft,
  Sliders,
  ClipboardList,
  Camera,
  Image as ImageIcon,
  Home,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/utils';
import { AppSettings } from '@/src/types';
import AppInfo from './AppInfo';

interface LayoutProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

export default function Layout({ settings, setSettings }: LayoutProps) {
  const [isAppInfoOpen, setIsAppInfoOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';

  const handleMenuAction = (action: string) => {
    setIsMainMenuOpen(false);
    
    switch (action) {
      case 'home':
        navigate('/');
        break;
      case 'favorites':
        navigate('/favorites');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'camera':
        if (!isHome) navigate('/');
        setTimeout(() => window.dispatchEvent(new CustomEvent('lumi:open-camera')), 100);
        break;
      case 'gallery':
        if (!isHome) navigate('/');
        setTimeout(() => window.dispatchEvent(new CustomEvent('lumi:open-gallery')), 100);
        break;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      {/* App Info Modal */}
      <AppInfo isOpen={isAppInfoOpen} onClose={() => setIsAppInfoOpen(false)} />
      
      {/* Minimalist Main Menu Ribbon */}
      <AnimatePresence>
        {isMainMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMainMenuOpen(false)}
              className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px] z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="fixed top-24 right-6 w-16 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-full z-[101] py-4 shadow-2xl flex flex-col items-center gap-4"
            >
              <IconButton 
                icon={<Camera size={20} />} 
                title="Câmera" 
                onClick={() => handleMenuAction('camera')} 
              />
              <IconButton 
                icon={<ImageIcon size={20} />} 
                title="Galeria" 
                onClick={() => handleMenuAction('gallery')} 
              />
              <div className="w-8 h-px bg-slate-200 dark:bg-white/10 my-1" />
              <IconButton 
                icon={<Star size={20} />} 
                title="Favoritos" 
                onClick={() => handleMenuAction('favorites')} 
              />
              <IconButton 
                icon={<History size={20} />} 
                title="Histórico" 
                onClick={() => handleMenuAction('history')} 
              />
              <IconButton 
                icon={<Settings size={20} />} 
                title="Ajustes" 
                onClick={() => handleMenuAction('settings')} 
              />
              <IconButton 
                icon={<Home size={20} />} 
                title="Início" 
                onClick={() => handleMenuAction('home')} 
              />
              <div className="w-8 h-px bg-slate-200 dark:bg-white/10 my-1" />
              <IconButton 
                icon={<X size={20} />} 
                title="Fechar" 
                onClick={() => setIsMainMenuOpen(false)}
                variant="danger"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <aside className="w-[280px] bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col p-6 hidden lg:flex shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3F8EFC] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Languages size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Lumi <span className="gradient-text">Translate</span>
          </h1>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarLink to="/" icon={<Languages size={20} />} label="Tradução" />
          <SidebarLink to="/favorites" icon={<Star size={20} />} label="Favoritos" />
          <SidebarLink to="/history" icon={<History size={20} />} label="Histórico" />
          <SidebarLink to="/settings" icon={<Settings size={20} />} label="Ajustes" />
        </nav>

        <div className="mt-auto p-4 glass-card border-[var(--card-border)]">
          <div className="flex items-center gap-2 mb-2 text-[#7B3FE4]">
            <Info size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Status Local</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-relaxed font-medium">
            AI Engine: GPT-4o-mini
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-16 lg:h-20 border-b border-[var(--card-border)] flex items-center justify-between px-6 lg:px-8 bg-[var(--bg-main)]/80 backdrop-blur-md z-30">
          <div className="flex items-center gap-3 lg:hidden">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4] to-[#3F8EFC] flex items-center justify-center text-white">
               <Languages size={18} />
             </div>
             <span className="font-bold text-lg">Lumi Translate</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8">
            <h2 className="text-sm font-bold uppercase tracking-[2px] opacity-50">Espaço de Trabalho</h2>
          </div>

          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsAppInfoOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-[#7B3FE4] transition-all active:scale-95"
                title="Informações"
             >
                <Info size={20} />
             </button>

             {/* Quick Settings Action */}
             <div className="relative">
                <button 
                    onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all active:scale-95",
                      isQuickSettingsOpen 
                        ? "bg-[#7B3FE4] text-white shadow-lg shadow-purple-500/20" 
                        : "bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-[#7B3FE4]"
                    )}
                    title="Configurações Rápidas"
                >
                    <Sliders size={20} />
                </button>

                <AnimatePresence>
                  {isQuickSettingsOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsQuickSettingsOpen(false)}
                        className="fixed inset-0 z-40 bg-transparent"
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] shadow-2xl z-50 overflow-hidden p-4"
                      >
                        <div className="flex flex-col gap-4">
                          <h3 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-1 px-1 text-center">Modo de Tradução</h3>
                          
                          <button
                            onClick={() => setSettings(prev => ({ ...prev, comparisonMode: !prev.comparisonMode }))}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-2xl transition-all border w-full text-left",
                              settings.comparisonMode 
                                ? "bg-blue-500/5 border-blue-500/20 text-blue-600 dark:text-blue-400" 
                                : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-500"
                            )}
                          >
                            <div className={cn(
                              "p-2 rounded-xl transition-colors",
                              settings.comparisonMode ? "bg-blue-500 text-white" : "bg-slate-200 dark:bg-zinc-800 text-slate-400"
                            )}>
                              <ClipboardList size={16} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[11px] font-black uppercase tracking-wider">Comparação IA</p>
                              <p className="text-[9px] opacity-60 leading-tight mt-0.5 font-bold">Múltiplos modelos</p>
                            </div>
                            <div className={cn(
                              "w-7 h-4 rounded-full relative transition-all bg-slate-200 dark:bg-zinc-800 shrink-0",
                              settings.comparisonMode && "bg-blue-500"
                            )}>
                              <motion.div 
                                className="absolute top-1 w-2 h-2 bg-white rounded-full transition-all"
                                animate={{ left: settings.comparisonMode ? 16 : 4 }}
                              />
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>

             {/* Main Menu Action */}
             <button 
                onClick={() => setIsMainMenuOpen(!isMainMenuOpen)}
                className={cn(
                  "p-2.5 rounded-xl transition-all active:scale-95",
                  isMainMenuOpen 
                    ? "bg-[#7B3FE4] text-white shadow-lg shadow-purple-500/20" 
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-[#7B3FE4]"
                )}
                title="Menu Principal"
             >
                <MoreVertical size={20} />
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-8 lg:p-10 relative pb-10">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </main>

        <footer className="hidden lg:flex h-14 border-t border-[var(--card-border)] items-center justify-between px-8 bg-[var(--bg-main)] text-xs text-slate-500">
           <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5 font-medium">
               <div className="w-2 h-2 rounded-full bg-green-500" />
               <span>Sistema Operacional</span>
             </div>
           </div>
           
           <div className="flex gap-6 font-bold uppercase tracking-widest text-[9px]">
              <span className="hover:text-[#7B3FE4] cursor-pointer transition-colors">v1.1.0-STABLE</span>
           </div>
        </footer>
      </div>
    </div>
  );
}

function IconButton({ icon, title, onClick, variant = 'default' }: { icon: React.ReactNode; title: string; onClick: () => void; variant?: 'default' | 'danger' }) {
  return (
    <button 
      onClick={onClick}
      title={title}
      className={cn(
        "p-3.5 rounded-2xl transition-all duration-300 active:scale-90 shadow-sm",
        variant === 'default' 
          ? "bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:bg-[#7B3FE4] hover:text-white" 
          : "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
      )}
    >
      {icon}
    </button>
  );
}

function MobileMenuOption({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 w-full px-5 py-4 rounded-[20px] transition-all duration-300 group font-bold text-[12px] uppercase tracking-widest",
        active 
          ? "bg-[#7B3FE4] text-white shadow-lg shadow-purple-500/20" 
          : "text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:text-[#7B3FE4]"
      )}
    >
      <span className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-slate-400")}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink 
      to={to}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group font-bold text-sm",
        isActive 
          ? "bg-[#7B3FE4] text-white shadow-xl shadow-purple-900/30" 
          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[var(--text-main)]"
      )}
    >
      <span className="transition-transform group-hover:scale-110">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

function MobileLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink to={to} className="flex flex-col items-center justify-center p-2 rounded-2xl min-w-[64px] transition-all duration-300">
      {({ isActive }) => (
        <>
          <span className={cn("transition-all duration-300", isActive ? "text-[#7B3FE4] scale-110" : "text-slate-400 dark:text-zinc-500")}>
            {icon}
          </span>
          <span className={cn("text-[9px] mt-1 font-bold uppercase tracking-wider transition-all duration-300", isActive ? "text-[#7B3FE4]" : "text-slate-400 dark:text-zinc-500")}>
            {label}
          </span>
          {isActive && (
            <motion.div layoutId="mob-nav" className="w-1 h-1 rounded-full bg-[#7B3FE4] mt-0.5" />
          )}
        </>
      )}
    </NavLink>
  );
}
