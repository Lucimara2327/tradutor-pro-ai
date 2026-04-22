
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Divide um texto longo em partes menores respeitando limites de caracteres,
 * evitando cortar palavras ao meio e priorizando quebras em sentenças ou espaços.
 */
export function splitLongText(text: string, maxLength: number = 400): string[] {
  if (!text || text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Tenta encontrar o final de uma sentença (. , ! , ?)
    let cutIdx = -1;
    const punctuationMarks = ['. ', '! ', '? ', '; '];
    
    for (const mark of punctuationMarks) {
      const idx = remaining.lastIndexOf(mark, maxLength);
      // Ajustamos para incluir a pontuação
      if (idx !== -1 && idx > cutIdx) cutIdx = idx + 1;
    }

    // Se não encontrar pontuação num intervalo razoável (últimos 30% do bloco), tenta espaço
    if (cutIdx === -1 || cutIdx < maxLength * 0.7) {
      const lastSpace = remaining.lastIndexOf(' ', maxLength);
      if (lastSpace !== -1) {
        cutIdx = lastSpace;
      }
    }

    // Se ainda assim não houver onde quebrar (palavra muito longa), corta no limite
    if (cutIdx === -1 || cutIdx === 0) {
      cutIdx = maxLength;
    }

    chunks.push(remaining.substring(0, cutIdx).trim());
    remaining = remaining.substring(cutIdx).trim();
  }

  return chunks;
}
