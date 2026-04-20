
import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Languages, History, Settings, Star, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import AppInfo from './AppInfo';

export default function Layout() {
  const [isAppInfoOpen, setIsAppInfoOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      {/* App Info Modal */}
      <AppInfo isOpen={isAppInfoOpen} onClose={() => setIsAppInfoOpen(false)} />
      {/* Sidebar - Desktop */}
      <aside className="w-[280px] bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col p-6 hidden lg:flex shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3F8EFC] flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Languages size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Tradutor <span className="gradient-text">Pro AI</span>
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
             <span className="font-bold text-lg">Tradutor Pro</span>
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

        <main className="flex-1 overflow-y-auto px-4 py-8 lg:p-10 relative pb-24 lg:pb-10">
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

        {/* Mobile Nav - Bottom Bar */}
        <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl flex items-center justify-around px-2 z-50 shadow-2xl shadow-purple-500/10">
          <MobileLink to="/" icon={<Languages size={22} />} label="Início" />
          <MobileLink to="/favorites" icon={<Star size={22} />} label="Salvos" />
          <MobileLink to="/history" icon={<History size={22} />} label="Recentes" />
          <MobileLink to="/settings" icon={<Settings size={22} />} label="Menu" />
        </nav>
      </div>
    </div>
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
