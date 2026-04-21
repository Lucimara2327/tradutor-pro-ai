
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route
  app.post('/api/translate', async (req, res) => {
    const { text, fromLang, toLang, engine, model, fluentMode, translationStyle, openaiApiKey } = req.body;
    const isFluent = !!fluentMode;
    const style = translationStyle || (isFluent ? 'fluent' : 'normal');

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

      let styleInstruction = "";
      if (isFluent) {
        styleInstruction = "- FLUENTE: natural, mas sem alterar sentido.";
      } else if (style === 'formal') {
        styleInstruction = "- FORMAL: linguagem educada e correta.";
      } else if (style === 'informal') {
        styleInstruction = "- INFORMAL: linguagem leve e comum.";
      } else {
        styleInstruction = "- NORMAL: tradução direta e fiel.";
      }

      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: 'system',
            content: `Traduza o texto de forma precisa e segura para o idioma de destino.

Regras obrigatórias:
- NÃO inventar conteúdo.
- NÃO adicionar palavras que não existem no original.
- NÃO usar linguagem ofensiva.
- Manter o significado original da frase.
- Adaptar levemente apenas para soar natural.
- Se a frase for simples, manter a tradução simples.

Estilo solicitado:
${styleInstruction}

IMPORTANTE: Retorne APENAS a tradução final, sem aspas e sem explicações.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: style === 'informal' ? 0.3 : 0.1,
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
