
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
      if (style === 'fluent') {
        styleInstruction = "- Estilo FLUENTE: Deixe a frase mais natural, como um falante nativo diria, sem alterar demais o sentido original.";
      } else if (style === 'formal') {
        styleInstruction = "- Estilo FORMAL: Use linguagem educada e mais completa, adequada para situações formais.";
      } else if (style === 'informal') {
        styleInstruction = "- Estilo INFORMAL: Use linguagem simples, leve e comum no dia a dia.";
      } else {
        styleInstruction = "- Estilo NORMAL: Realize uma tradução fiel e direta, mantendo o significado original.";
      }

      const response = await openai.chat.completions.create({
        model: openaiModel,
        messages: [
          {
            role: 'system',
            content: `Você é um tradutor nível profissional. 
Regras:
- NÃO traduza palavra por palavra, mas FOQUE em preservar o significado original.
${styleInstruction}
- NÃO exagere na reescrita; evite mudar demais a estrutura se não for estritamente necessário.
- Corrija eventuais erros gramaticais do texto original durante a tradução.
- Retorne APENAS a tradução final, sem aspas e sem explicações.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: style === 'informal' ? 0.5 : 0.3,
      });

      const translatedText = response.choices[0]?.message?.content?.trim() || '';
      
      if (!translatedText) {
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
