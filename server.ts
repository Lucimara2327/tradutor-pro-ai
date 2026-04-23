
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';
import { getTranslationPrompt } from './src/services/prompts.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route
  app.post('/api/translate', async (req, res) => {
    const { text, fromLang, toLang, engine, model, translationStyle, openaiApiKey, isAdjustment } = req.body;
    const style = translationStyle || 'normal';

    if (engine !== 'openai') {
      return res.status(400).json({ error: 'Unsupported backend engine' });
    }

    try {
      if (!text || !fromLang || !toLang) {
        throw new Error('Missing required fields');
      }

      const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
      }

      const openai = new OpenAI({ apiKey });
      const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

      const prompt = getTranslationPrompt({
        fromLang,
        toLang,
        style: style as any,
        text,
        isAdjustment: !!isAdjustment
      });

      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: style === 'informal' ? 0.3 : 0.05,
      });

      const translatedText = response.choices[0]?.message?.content?.trim() || '';
      
      if (!translatedText) {
        throw new Error('SERVER_INVALID_RESPONSE');
      }

      return res.json({ translatedText });
    } catch (error: any) {
      const isRateLimit = error.status === 429 || (error.message && (error.message.includes('quota') || error.message.includes('Rate limit')));
      
      if (isRateLimit) {
        console.warn('[SERVER_QUOTA] OpenAI quota exceeded or rate limit hit. Notifying frontend.');
      } else {
        console.error('Server translation error:', error);
      }
      
      const errorMsg = error.message || String(error);
      const isInvalidKey = errorMsg.includes('API key not valid') || errorMsg.includes('INVALID_KEY') || error.status === 401;
      
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
