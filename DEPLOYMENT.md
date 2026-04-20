# 🚀 Guia de Deploy Externo: Tradutor Pro AI

Este guia explica como publicar o **Tradutor Pro AI** fora do ambiente do Google AI Studio em plataformas como Replit, Netlify, Vercel ou GitHub Pages.

---

## 🛠 Pré-requisitos
- Uma conta em um serviço de hospedagem (ex: [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/) ou [Replit](https://replit.com/)).
- Sua chave API da OpenAI (opcional, configurável dentro do app).
- Sua chave API do Gemini (necessária se quiser usar o motor Gemini fora do AI Studio).

---

## 📁 Estrutura de Arquivos para Deploy
Após o comando de build, você encontrará a versão final na pasta `/dist`. Esta pasta contém:
- `index.html`: O ponto de entrada do app.
- `assets/`: Arquivos CSS e JavaScript minificados e otimizados.
- `manifest.json`: Configurações do PWA.
- `sw.js`: Service Worker para cache e offline.

---

## ☁️ Opções de Hospedagem

### 1. Netlify / Vercel (Recomendado para sites estáticos)
Estas são as opções mais rápidas e profissionais.
1. **Conecte seu GitHub** ou faça upload da pasta `dist`.
2. **Configurações de Build:**
   - Build Command: `npm run build`
   - Publish Directory: `dist`
3. **Variáveis de Ambiente:**
   - Se você usa o motor Gemini, adicione `VITE_GEMINI_API_KEY` nas configurações de ambiente do host.

### 2. Replit
1. Crie um novo Repl do tipo **"Static Site"** ou **"React"**.
2. Suba todos os arquivos do projeto.
3. No arquivo `package.json`, certifique-se de que o script `build` existe.
4. Execute `npm run build` no console do Replit.
5. Configure o Replit para servir a pasta `dist` (ou use um servidor Express simples se preferir).

### 3. GitHub Pages
1. No seu repositório, vá em **Settings > Pages**.
2. Selecione a branch `main` (ou a que contém o build) e a pasta `/docs` (ou use uma Action de deploy para Vite).

---

## 🔑 Configuração de Chaves API fora do AI Studio
No AI Studio, a chave do Gemini é injetada automaticamente. Ao fazer o deploy externo:
1. **OpenAI:** Continue inserindo sua chave diretamente na tela de **Ajustes** do app (salva no seu navegador).
2. **Gemini:** 
   - Você deve definir a variável `VITE_GEMINI_API_KEY` no seu ambiente de deploy.
   - O código foi preparado para ler `import.meta.env.VITE_GEMINI_API_KEY` se disponível.

---

## 📱 Transformando em App Instalável (PWA)
O app já possui `manifest.json` e `Service Worker`. Ao acessar o link público do seu deploy pelo celular:
1. O navegador (Chrome/Safari) detectará o PWA.
2. Você poderá clicar em **"Adicionar à Tela de Início"**.
3. O app funcionará em modo **Standalone**, sem bordas de navegador.

---

## 📄 Notas de Versão
- **HTML/CSS/JS:** Totalmente separados e otimizados para produção.
- **Service Worker:** Ativado para carregamento rápido.
- **Offline:** Suporte básico a cache de interface.
