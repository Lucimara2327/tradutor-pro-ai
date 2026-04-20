
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
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
          }

          const openai = new OpenAI({ apiKey });
          const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

          const normalPrompt = `Você é um tradutor profissional. Sua tarefa é traduzir o texto de forma DIRETA, LITERAL e FIEL. 
REGRAS:
- PRIORIDADE: Sempre priorize a tradução literal.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- NÃO interprete o texto.
- NÃO adicione palavras ou explicações.
- Mantenha a estrutura exata da frase original.
- Responda APENAS com a tradução.
Idioma de destino: ${toLang}`;

          const fluentPrompt = `Você é um tradutor profissional. Sua tarefa é traduzir o texto de forma NATURAL e FLUIDA, mas mantendo a FIDELIDADE ABSOLUTA ao significado original.
REGRAS:
- PRIORIDADE: Priorize a fidelidade à tradução literal antes da fluidez.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- NÃO reformule o sentido.
- NÃO invente frases ou adicione palavras (como "querido", "amigo", etc).
- Ajuste apenas a gramática e concordância para soar natural no idioma de destino.
- Responda APENAS com a tradução.
Idioma de destino: ${toLang}`;

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
            temperature: isFluent ? 0.3 : 0.1, // Lower temperature for accuracy
          });

          translated = response.choices[0]?.message?.content?.trim() || '';
        } else if (engine === 'gemini') {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
          }

          const ai = new GoogleGenAI({ apiKey });
          const geminiModel = "models/gemini-1.5-flash";

          const context = `Traduza de ${fromLang === 'auto' ? 'detectado' : fromLang} para ${toLang}.`;
          
          const normalRules = `
REGRAS (MODO NORMAL):
- PRIORIDADE: Sempre priorize a tradução literal.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- Tradução DIRETA, LITERAL e CORRETA.
- Manter a estrutura da frase original.
- NÃO interpretar, NÃO reformular, NÃO adicionar palavras.`;

          const fluentRules = `
REGRAS (MODO FLUENTE):
- PRIORIDADE: Priorize a fidelidade à tradução literal antes da fluidez.
- AMBIGUIDADE: Se houver ambiguidade, escolha o significado mais comum.
- Tradução NATURAL e FLUIDA.
- FIDELIDADE ABSOLUTA ao significado e intenção original.
- Ajuste apenas gramática e concordância.
- NÃO invente frases, NÃO adicione palavras extras.`;

          const promptText = `Você é um tradutor profissional. ${context}
${isFluent ? fluentRules : normalRules}

Proibido: responder como chat, fazer perguntas, explicações ou aspas.
Retorne APENAS o texto traduzido.

Texto original:
${text}`;

          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: [{ parts: [{ text: promptText }] }],
            config: {
              temperature: isFluent ? 0.3 : 0.1,
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
