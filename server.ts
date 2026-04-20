
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
    const { text, fromLang, toLang, engine, model } = req.body;

    try {
      if (!text || !fromLang || !toLang) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (engine === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'GEMINI_API_KEY_NOT_CONFIGURED', source: 'server' });
        }

        const ai = new GoogleGenAI({ apiKey });
        const geminiModel = model?.startsWith('gpt') ? 'gemini-3-flash-preview' : (model || 'gemini-3-flash-preview');

        const prompt = `Traduza o seguinte texto de forma natural e precisa para o idioma solicitado. Retorne APENAS o texto traduzido, sem explicações.
Origem: ${fromLang}
Destino: ${toLang}
Texto: ${text}`;

        const response = await ai.models.generateContent({
          model: geminiModel,
          contents: [{ parts: [{ text: prompt }] }],
        });

        const translated = response.text?.trim();
        return res.json({ translatedText: translated });
      } 
      
      if (engine === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          return res.status(500).json({ error: 'OPENAI_API_KEY_NOT_CONFIGURED', source: 'server' });
        }

        const openai = new OpenAI({ apiKey });
        const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

        const response = await openai.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: 'system',
              content: `Traduza o seguinte texto de forma natural e precisa para o idioma solicitado. Retorne apenas a tradução. De: ${fromLang} Para: ${toLang}`
            },
            {
              role: 'user',
              content: text,
            },
          ],
          temperature: 0.3,
        });

        const translated = response.choices[0]?.message?.content?.trim();
        return res.json({ translatedText: translated });
      }

      res.status(400).json({ error: 'Invalid engine' });
    } catch (error: any) {
      console.error('Server translation error:', error);
      res.status(500).json({ 
        error: error.message || 'Translation failed',
        code: error.status === 401 ? 'INVALID_KEY' : 'SERVER_ERROR'
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
