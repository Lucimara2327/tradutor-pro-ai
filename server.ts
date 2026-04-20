
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route
  app.post('/api/translate', async (req, res) => {
    const { text, fromLang, toLang, engine, model, fluentMode } = req.body;
    const isFluent = !!fluentMode;

    async function attemptTranslation(retryCount = 0): Promise<string> {
      try {
        if (!text || !fromLang || !toLang) {
          throw new Error('Missing required fields');
        }

        let translated = '';

        if (engine === 'openai' || (isFluent && engine === 'gemini')) {
          const apiKey = process.env.OPENAI_API_KEY;
          // If in fluent mode but no OpenAI key, we might want to throw or fallback later
          // For now, let's try OpenAI if it's fluent or explicitly selected
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
          }

          const openai = new OpenAI({ apiKey });
          const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

          const fluentPrompt = `Translate the following text from ${fromLang === 'auto' ? 'source language' : fromLang} to ${toLang} in a natural, fluent and human-like way. Do not translate word by word. Adapt the sentence as a native speaker would say it. Use ONLY the translated text in the response.`;

          const response = await openai.chat.completions.create({
            model: openaiModel,
            messages: [
              {
                role: 'system',
                content: isFluent 
                  ? fluentPrompt 
                  : `Você é um tradutor profissional altamente experiente. Sua tarefa é traduzir o texto do usuário para o idioma de destino (${toLang}) de forma precisa e direta. Mantenha a integridade total do texto original. Responda APENAS com a tradução, sem explicações.`
              },
              {
                role: 'user',
                content: text,
              },
            ],
            temperature: isFluent ? 0.7 : 0.2,
          });

          translated = response.choices[0]?.message?.content?.trim() || '';
        } else if (engine === 'gemini') {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
          }

          const ai = new GoogleGenAI({ apiKey });
          const geminiModel = "models/gemini-1.5-flash";

          const originContext = fromLang === 'auto' ? 'Idioma detectado automaticamente' : `Idioma: ${fromLang}`;
          const destContext = `Idioma de destino: ${toLang}`;

          const promptText = `Você é um tradutor profissional multilíngue. Traduza o texto abaixo fielmente.
Mantenha o tom, o sentido e a formatação originais. Não omita partes importantes. Retorne APENAS o texto traduzido.

Contexto:
${originContext}
${destContext}

Texto original:
${text}`;

          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: [{ parts: [{ text: promptText }] }],
            config: {
              temperature: 0.2,
            }
          });

          translated = response.text?.trim() || '';
        } else {
          throw new Error('Invalid engine');
        }

        return translated;
      } catch (err) {
        if (retryCount < 1) return await attemptTranslation(retryCount + 1);
        throw err;
      }
    }

    try {
      const translatedText = await attemptTranslation();
      if (!translatedText || translatedText.trim() === "" || translatedText === text) {
        throw new Error('SERVER_INVALID_RESPONSE');
      }
      return res.json({ translatedText });
    } catch (error: any) {
      console.error('Server translation error:', error);
      
      const errorMsg = error.message || String(error);
      const isInvalidKey = errorMsg.includes('API key not valid') || errorMsg.includes('INVALID_KEY') || error.status === 401;
      const isRateLimit = errorMsg.includes('quota exceeded') || errorMsg.includes('Rate limit') || error.status === 429;
      
      res.status(isInvalidKey ? 401 : (isRateLimit ? 429 : 500)).json({ 
        error: errorMsg,
        source: 'server',
        code: isInvalidKey ? 'INVALID_KEY' : (isRateLimit ? 'RATE_LIMIT' : 'SERVER_ERROR')
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serving static files for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
