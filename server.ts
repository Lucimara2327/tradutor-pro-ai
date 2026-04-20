
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

        if (engine === 'gemini') {
          const apiKey = process.env.GEMINI_API_KEY;
          if (!apiKey) {
            throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
          }

          const ai = new GoogleGenAI({ apiKey });
          const geminiModel = model?.startsWith('gpt') ? 'gemini-1.5-flash' : (model || 'gemini-1.5-flash');

          const originContext = fromLang === 'auto' ? 'Idioma detectado automaticamente' : `Idioma: ${fromLang}`;
          const destContext = `Idioma de destino: ${toLang}`;

          const fluentRules = `
Regras do MODO FLUENTE ATIVADO:
- Gere uma tradução NATURAL, como um falante nativo escreveria.
- Não traduza palavra por palavra; foque no contexto e na fluidez.
- Ajuste a gramática e a estrutura da frase para soar humana e idiomática.
- Mantenha o nível de formalidade (casual, profissional ou neutro) do original, mas adaptado culturalmente.
- Se for uma expressão idiomática, use a equivalente no idioma de destino.`;

          const prompt = `Você é um tradutor profissional multilíngue. Traduza o texto abaixo ${isFluent ? 'de forma FLUENTE e NATURAL' : 'fielmente'}.
${isFluent ? fluentRules : 'Mantenha o tom, o sentido e a formatação originais.'}
Não omita partes importantes. Retorne APENAS o texto traduzido.

Contexto:
${originContext}
${destContext}

Texto original:
${text}`;

          const response = await ai.models.generateContent({
            model: geminiModel,
            contents: [{ parts: [{ text: prompt }] }],
            config: {
              temperature: isFluent ? 0.7 : 0.2, // Higher temperature for more creative/natural flow
            }
          });

          translated = response.text?.trim();
        } else if (engine === 'openai') {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY_NOT_CONFIGURED');
          }

          const openai = new OpenAI({ apiKey });
          const openaiModel = model?.startsWith('gemini') ? 'gpt-4o-mini' : (model || 'gpt-4o-mini');

          const fluentPrompt = `
Regras do MODO FLUENTE ATIVADO:
- Gere uma tradução NATURAL, como um falante nativo escreveria.
- Não traduza palavra por palavra; foque no contexto e na fluidez.
- Ajuste a gramática e a estrutura da frase para soar humana e idiomática.
- Mantenha o nível de formalidade do original, mas adaptado culturalmente.
- Use APENAS o texto traduzido na resposta.`;

          const response = await openai.chat.completions.create({
            model: openaiModel,
            messages: [
              {
                role: 'system',
                content: `Você é um tradutor profissional altamente experiente. Sua tarefa é traduzir o texto do usuário para o idioma de destino (${toLang}) de forma ${isFluent ? 'NATURAL, HUMANA e CONTEXTUAL (Modo Fluente)' : 'precisa e direta'}. 
${isFluent ? fluentPrompt : "Mantenha a integridade total do texto original. Responda APENAS com a tradução, sem explicações."}`
              },
              {
                role: 'user',
                content: text,
              },
            ],
            temperature: isFluent ? 0.7 : 0.2,
          });

          translated = response.choices[0]?.message?.content?.trim() || '';
        } else {
          throw new Error('Invalid engine');
        }

        // Basic validation: If original is long but translation is just 1-2 words, something is wrong
        const originalWords = text.trim().split(/\s+/).length;
        const translatedWords = translated.split(/\s+/).length;

        if (originalWords > 5 && translatedWords < 2 && retryCount < 2) {
          console.warn(`Translation seems suspiciously short (${translatedWords} vs ${originalWords} words). Retrying...`);
          return await attemptTranslation(retryCount + 1);
        }

        return translated;
      } catch (err) {
        if (retryCount < 1) return await attemptTranslation(retryCount + 1);
        throw err;
      }
    }

    try {
      const translatedText = await attemptTranslation();
      return res.json({ translatedText });
    } catch (error: any) {
      console.error('Server translation error:', error);
      
      const errorMsg = error.message || '';
      const isInvalidKey = errorMsg.includes('API key not valid') || errorMsg.includes('INVALID_KEY') || error.status === 401;
      const isConfigError = errorMsg.includes('NOT_CONFIGURED') || isInvalidKey;
      
      res.status(isInvalidKey ? 401 : 500).json({ 
        error: isInvalidKey ? 'Chave API do servidor inválida' : (error.message || 'Translation failed'),
        source: 'server',
        code: isInvalidKey ? 'INVALID_KEY' : 'SERVER_ERROR',
        details: errorMsg
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
