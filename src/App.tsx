import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Translator from './pages/Translator';
import HistoryPage from './pages/History';
import FavoritesPage from './pages/Favorites';
import SettingsPage from './pages/Settings';
import { AppSettings, Translation } from './types';

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('translator_settings');
    const defaultSettings: AppSettings = {
      openaiApiKey: '',
      geminiApiKey: '',
      theme: 'light',
      autoPlayAudio: false,
      model: 'gemini-1.5-flash',
      engine: 'gemini',
      fluentMode: true,
    };
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: insure engine exists and model is compatible
      if (!parsed.engine) {
        parsed.engine = 'gemini';
        parsed.model = 'gemini-1.5-flash';
      }
      if (parsed.fluentMode === undefined) {
        parsed.fluentMode = true;
      }
      if (parsed.model.includes('gemini')) {
        parsed.model = 'gemini-1.5-flash';
      }
      if (parsed.geminiApiKey === undefined) {
        parsed.geminiApiKey = '';
      }
      return { ...defaultSettings, ...parsed };
    }
    return defaultSettings;
  });

  const [history, setHistory] = useState<Translation[]>(() => {
    const saved = localStorage.getItem('translator_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('translator_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('translator_history', JSON.stringify(history));
  }, [history]);

  const addTranslation = (t: Translation) => {
    setHistory(prev => [t, ...prev].slice(0, 50)); // Keep last 50
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(t => t.id === id ? { ...t, isFavorite: !t.isFavorite } : t));
  };

  const deleteTranslation = (id: string) => {
    setHistory(prev => prev.filter(t => t.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <BrowserRouter basename={(import.meta as any).env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={
            <Translator 
              settings={settings} 
              setSettings={setSettings}
              addTranslation={addTranslation} 
            />
          } />
          <Route path="history" element={
            <HistoryPage 
              history={history} 
              toggleFavorite={toggleFavorite} 
              deleteTranslation={deleteTranslation} 
              clearHistory={clearHistory}
            />
          } />
          <Route path="favorites" element={
            <FavoritesPage 
              history={history.filter(t => t.isFavorite)} 
              toggleFavorite={toggleFavorite} 
              deleteTranslation={deleteTranslation}
            />
          } />
          <Route path="settings" element={
            <SettingsPage 
              settings={settings} 
              setSettings={setSettings} 
              canInstall={!!deferredPrompt}
              onInstall={handleInstallClick}
            />
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
