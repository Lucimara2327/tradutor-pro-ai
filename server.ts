
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
    const { text, fromLang, toLang, engine, model, fluentMode, geminiApiKey, openaiApiKey } = req.body;
    const isFluent = !!fluentMode;

    async function attemptTranslation(retryCount = 0): Promise<string> {
      try {
        if (!text || !fromLang || !toLang) {
          throw new Error('Missing required fields');
        }

        let translated = '';

        if (engine === 'openai') {
          const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
          }

          const openai = new OpenAI({ apiKey });
          const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

          const normalPrompt = `Você é um tradutor PRO. Traduza o texto de forma DIRETA, LITERAL e FIEL. 
REGRAS:
- PRIORIDADE: Tradução literal absoluta.
- AMBIGUIDADE: Use o significado mais comum.
- RESPOSTA: Apenas a tradução, sem aspas ou explicações.
Idioma destino: ${toLang}`;

          const fluentPrompt = `Você é um tradutor PRO inteligente. Traduza o texto de forma NATURAL e FLUENTE.
REGRAS:
- FLUIDEZ: Melhore levemente a concordância e naturalidade.
- FIDELIDADE: Mantenha o significado e intenção original intactos.
- AMBIGUIDADE: Use o significado mais comum.
- RESPOSTA: Apenas a tradução, sem aspas ou explicações.
Idioma destino: ${toLang}`;

          const response = await openai.chat.completions.create({
            model: openaiModel,
            messages: [
              {
                role: 'system',
                content: isFluent ? fluentPrompt : normalPrompt
              },
              {
                role: 'user',
                content: text,
              },
            ],
            temperature: isFluent ? 0.2 : 0.05,
          });

          translated = response.choices[0]?.message?.content?.trim() || '';
        } else if (engine === 'gemini') {
          const apiKey = geminiApiKey || process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
          }

          const ai = new GoogleGenAI({ apiKey });
          const geminiModel = "gemini-3-flash-preview";

          const promptText = `Você é um tradutor rápido. Traduza de forma DIRETA e LITERAL.
Regras:
- NÃO use modo fluente.
- NÃO reescreva ou interprete.
- Priorize velocidade e fidelidade literal.
- Se houver ambiguidade, escolha o significado mais comum.
- Retorne APENAS o texto traduzido.
Idioma destino: ${toLang}

Texto:
${text}`;

          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: promptText,
            config: {
              temperature: 0,
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
