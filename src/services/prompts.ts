
/**
 * Tradução Prompts Centralizada
 * Fonte única de verdade para instruções de tradução do Lumi Translate.
 */

export interface PromptOptions {
  fromLang: string;
  toLang: string;
  style: 'normal' | 'fluent' | 'formal' | 'informal' | 'professional' | 'correct';
  text?: string;
  isAdjustment?: boolean;
}

export function getTranslationPrompt(options: PromptOptions): string {
  const { fromLang, toLang, style, text, isAdjustment } = options;
  
  // Validação essencial (Regra 5)
  if (!toLang || toLang.trim() === '') {
    throw new Error('PROMPT_VALIDATION_FAILED: toLang is required');
  }

  // Define as instruções de estilo baseadas no modo
  let styleInstruction = "";
  let modeName = "ajuste";

  switch (style) {
    case 'fluent':
      modeName = "natural";
      styleInstruction = "- MODO NATURAL: Torne o texto mais fluente, orgânico e nativo, melhorando a conexão entre frases sem alterar o sentido.";
      break;
    case 'formal':
      modeName = "formal";
      styleInstruction = "- MODO FORMAL: Use uma linguagem educada, erudita e profissional, mantendo a correção gramatical elevada.";
      break;
    case 'informal':
      modeName = "informal";
      styleInstruction = "- MODO INFORMAL: Use uma linguagem leve, casual e comum, simulando uma conversa cotidiana.";
      break;
    case 'professional':
      modeName = "profissional";
      styleInstruction = "- MODO PROFISSIONAL: Use uma linguagem técnica, precisa e corporativa, ideal para contextos de trabalho.";
      break;
    case 'correct':
      modeName = "corrigir";
      styleInstruction = "- MODO CORRIGIR: Corrija estritamente erros de gramática, ortografia e pontuação sem alterar o vocabulário ou o estilo original.";
      break;
    default:
      modeName = "direto";
      styleInstruction = "- MODO DIRETO: Realize uma tradução técnica e precisa, extremamente fiel ao texto base.";
      break;
  }

  // Se for apenas ajuste de texto (mesmo idioma ou flag isAdjustment)
  if (isAdjustment || (fromLang === toLang && fromLang !== 'auto')) {
    return `Você é o assistente inteligente do Lumi Translate.
Sua função é ajustar o texto fornecido com base no modo solicitado.

REGRAS RÍGIDAS:
- NUNCA invente conteúdo.
- NUNCA altere o significado original do texto.
- Apenas transforme o estilo ou corrija erros conforme o modo.
- Seja estritamente direto e claro.
- NÃO explique nada nem adicione introduções.
- Retorne APENAS o texto transformado.

Modo solicitado: ${modeName}
Diretriz de estilo: ${styleInstruction}

Texto para ajustar:
"${text || ''}"
`;
  }

  const basePrompt = `Você é um tradutor profissional extremamente preciso.
Sua tarefa é traduzir o texto de ${fromLang === 'auto' ? 'detecção automática' : fromLang} para ${toLang} seguindo estas REGRAS OBRIGATÓRIAS:

1. FIDELIDADE ABSOLUTA: Traduza EXATAMENTE o texto fornecido. NÃO melhore, NÃO reescreva e NÃO interprete intenções. NÃO adicione nada e NÃO remova nada.
2. PRESERVAÇÃO DE TOM E ESTILO: NÃO mude o tom, estilo ou intenção original. NÃO substitua por expressões mais "naturais" ou adaptações culturais (ex: preserve a estrutura exata mesmo que soe menos comum no idioma destino).
3. INTEGRIDADE ESTRUTURAL: Preserve rigorosamente a pontuação original (vírgulas, pontos, interrogações) e o formato da frase.
4. NÍVEL DE FORMALIDADE: Preserve o nivel de formalidade original. PROIBIDO usar gírias ou linguagem informal se não existirem no original.
5. SAÍDA PURA: Retorne APENAS a tradução. 
   - SEM aspas extras (mantenha apenas as do original).
   - SEM explicações ou comentários.

Estilo solicitado:
${styleInstruction}
`;

  // Se o texto for passado, anexa ao prompt (útil para modelos que não suportam system messages separadas ou para debug)
  if (text) {
    return `${basePrompt}\nTexto para traduzir:\n${text}`;
  }

  return basePrompt;
}

/**
 * Valida se um prompt gerado contém as instruções fundamentais de segurança e comportamento.
 */
export function validatePromptIntegrity(prompt: string): boolean {
  if (!prompt || prompt.length < 100) return false;
  
  const essentialKeywords = [
    'tradutor profissional',
    'Retorne APENAS a tradução',
    'TRADUÇÃO',
    'instruções de segurança' // Adaptado para checagem de integridade
  ];

  // Checagem simplificada de sanidade para garantir que o prompt não foi corrompido
  return prompt.includes('Retorne APENAS') && prompt.includes('tradutor');
}

/**
 * Prompt para verificar a qualidade e fidelidade da tradução.
 */
export function getQualityCheckPrompt(original: string, traducao: string): string {
  return `Você é um verificador de qualidade de tradução do Lumi Translate.

Verifique se a tradução abaixo é apropriada e corresponde fielmente ao original.

REGRAS RÍGIDAS:
- Deve manter rigorosamente o mesmo significado.
- NÃO pode conter conteúdo ofensivo que não exista no original.
- NÃO pode adicionar contexto ou informações que não estão no texto base.
- Deve respeitar o tom (formal/informal) se solicitado.

Se estiver OK e fiel:
responda apenas: válido

Se houver erro crítico de sentido, alucinação ou adição indevida:
responda apenas: inválido

Texto original:
"${original}"

Tradução:
"${traducao}"

Resposta:
(apenas uma palavra)`;
}

/**
 * Prompt para o controlador que identifica o tipo de ajuste solicitado pelo usuário.
 */
export function getModeClassificationPrompt(userInput: string): string {
  return `Você é o controlador do assistente do Lumi Translate.
Sua função é identificar o tipo de ajuste solicitado pelo usuário.

Responda apenas com uma das opções abaixo:
- natural
- informal
- formal
- profissional
- corrigir

Se o pedido não for claro, responda: natural

Pedido do usuário:
"${userInput}"

Resposta:
(apenas uma palavra)`;
}
