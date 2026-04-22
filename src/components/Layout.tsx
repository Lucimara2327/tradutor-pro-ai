
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Languages, History, Settings, Star, Info, MoreHorizontal, ChevronUp, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/utils';
import AppInfo from './AppInfo';

export default function Layout() {
  const [isAppInfoOpen, setIsAppInfoOpen] = useState(false);
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isOptionsActive = location.pathname !== '/';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      {/* Options Menu Modal/Overlay */}
      <AnimatePresence>
        {isOptionsMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOptionsMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-[320px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-[32px] p-2 z-[70] lg:hidden shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col gap-1">
                <div className="px-5 py-3 mb-1 flex items-center">
                  <button 
                    onClick={() => { navigate('/'); setIsOptionsMenuOpen(false); }}
                    className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-[#7B3FE4] hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all active:scale-90"
                  >
                    <ArrowLeft size={22} />
                  </button>
                </div>
                
                <MobileMenuOption 
                  icon={<Star size={20} />} 
                  label="Favoritos" 
                  onClick={() => { navigate('/favorites'); setIsOptionsMenuOpen(false); }}
                  active={location.pathname === '/favorites'}
                />

                <MobileMenuOption 
                  icon={<History size={20} />} 
                  label="Histórico" 
                  onClick={() => { navigate('/history'); setIsOptionsMenuOpen(false); }}
                  active={location.pathname === '/history'}
                />
                <MobileMenuOption 
                  icon={<Settings size={20} />} 
                  label="Ajustes" 
                  onClick={() => { navigate('/settings'); setIsOptionsMenuOpen(false); }}
                  active={location.pathname === '/settings'}
                />

                <button 
                  onClick={() => setIsOptionsMenuOpen(false)}
                  className="mt-2 w-full py-4 bg-slate-50 dark:bg-zinc-800/50 text-slate-500 font-bold text-[11px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2"
                >
                  <ChevronUp className="rotate-180" size={14} />
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* App Info Modal */}
      <AppInfo isOpen={isAppInfoOpen} onClose={() => setIsAppInfoOpen(false)} />
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

          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsAppInfoOpen(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-700 hover:text-[#7B3FE4] transition-all"
             >
                <Info size={18} />
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

        {/* Mobile FAB - Bottom Right */}
        <div className="lg:hidden fixed bottom-5 right-5 z-50">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={() => setIsOptionsMenuOpen(true)}
            className={cn(
              "flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 relative group overflow-hidden",
              isOptionsActive 
                ? "bg-[#7B3FE4] text-white shadow-purple-500/40" 
                : "bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 shadow-black/10 border border-slate-200 dark:border-white/10 hover:text-[#7B3FE4]"
            )}
          >
            <MoreHorizontal size={28} className={cn("transition-transform duration-500", isOptionsMenuOpen && "rotate-90")} />
            
            {/* Click Ripple Effect Placeholder - Simple Scale */}
            <span className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
            
            {/* Visual indicator for menu being open */}
            {isOptionsMenuOpen && (
              <motion.div 
                layoutId="menu-indicator"
                className="absolute -top-1 w-1.5 h-1.5 bg-[#7B3FE4] rounded-full"
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
            )}
          </motion.button>
        </div>
      </div>
    </div>
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
