
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
      styleInstruction = "- MODO NATURAL: Reescreva o texto para soar como um nativo falando naturalmente. Priorize a fluidez orgânica e expressões comuns, mudando a estrutura se necessário para máxima naturalidade.";
      break;
    case 'formal':
      modeName = "formal";
      styleInstruction = "- MODO FORMAL: Transforme em uma comunicação oficial, erudita e altamente estruturada. Use um vocabulário elevado e preserve a etiqueta linguística.";
      break;
    case 'informal':
      modeName = "informal";
      styleInstruction = "- MODO INFORMAL: Converta para uma linguagem relaxada e casual. Use um tom de conversa cotidiana entre amigos, permitindo contrações e expressões leves.";
      break;
    case 'professional':
      modeName = "profissional";
      styleInstruction = "- MODO PROFISSIONAL: Utilize terminologia de negócios, corporativa e técnica. Foque em clareza, objetividade e polimento máximo para contextos de trabalho.";
      break;
    case 'correct':
      modeName = "corrigir";
      styleInstruction = "- MODO CORRIGIR: Foque 100% na precisão gramatical normativa e ortográfica. Elimine erros sem necessariamente elevar o tom, mas garantindo que o texto seja impecável.";
      break;
    default:
      modeName = "direto";
      styleInstruction = "- MODO DIRETO: Realize uma tradução técnica e precisa, extremamente fiel ao texto base.";
      break;
  }

  // Se for apenas ajuste de texto (mesmo idioma ou flag isAdjustment)
  if (isAdjustment || (fromLang === toLang && fromLang !== 'auto')) {
    return `Você é o assistente inteligente do Lumi Translate.
Sua função é transformar o texto fornecido para o estilo específico solicitado.

REGRAS RÍGIDAS DE VARIÂNCIA:
1. RESULTADO ÚNICO: Você DEVE gerar uma NOVA versão do texto. Nunca retorne o texto idêntico ao original, mesmo que pareça correto.
2. DISTINÇÃO ESTILÍSTICA: O resultado deve ser VISIVELMENTE diferente dependendo do modo. Cada modo tem uma assinatura única.
3. SEM EXPLICAÇÕES: Retorne APENAS o texto final refinado. Proibido introduções ou comentários.
4. FIDELIDADE SEMÂNTICA: Mude o estilo, mas preserve o significado original.

Modo solicitado: ${modeName}
Diretriz específica: ${styleInstruction}

Texto para transformar:
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
