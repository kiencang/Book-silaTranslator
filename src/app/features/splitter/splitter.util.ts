export interface PreviewChapter {
  title: string;
  previewText: string;
  wordCount: number;
  originalText: string;
  excludeFromTranslation?: boolean;
}

export interface SplitMethod {
  keyword: string;
  count: number;
  previewChapters: PreviewChapter[];
}

export function countWords(text: string): number {
  let count = 0;
  let inWord = false;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Check for common whitespace characters
    const isWhitespace = c <= 32 || c === 160 || (c >= 8192 && c <= 8202) || c === 12288;
    
    if (isWhitespace) {
      inWord = false;
    } else {
      if (!inWord) {
        count++;
        inWord = true;
      }
    }
  }
  return count;
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function smartHardSplit(text: string, maxWords: number): string[] {
  const words = countWords(text);
  if (words <= maxWords) return [text];

  const minPos = Math.floor(text.length * 0.2);
  const maxPos = Math.floor(text.length * 0.8);
  const targetPos = Math.floor(text.length * 0.5);

  let splitPos = -1;

  // Pri 1: \n\n
  const doubleNewlineRegex = /\n[ \t]*\n/g;
  let match;
  let bestDist = Infinity;

  while ((match = doubleNewlineRegex.exec(text)) !== null) {
      if (match.index >= minPos && match.index <= maxPos) {
          const dist = Math.abs(match.index - targetPos);
          if (dist < bestDist) {
              bestDist = dist;
              splitPos = match.index;
          }
      }
  }

  // Pri 2: single \n
  if (splitPos === -1) {
    const singleNewlineRegex = /\n/g;
    bestDist = Infinity;
    while ((match = singleNewlineRegex.exec(text)) !== null) {
        if (match.index >= minPos && match.index <= maxPos) {
            const dist = Math.abs(match.index - targetPos);
            if (dist < bestDist) {
                bestDist = dist;
                splitPos = match.index;
            }
        }
    }
  }

  // Pri 3: sentence end
  if (splitPos === -1) {
    const sentenceEndRegex = /[.?!]\s+/g;
    bestDist = Infinity;
    while ((match = sentenceEndRegex.exec(text)) !== null) {
        if (match.index >= minPos && match.index <= maxPos) {
            const dist = Math.abs(match.index - targetPos);
            if (dist < bestDist) {
                bestDist = dist;
                splitPos = match.index + 1; // split after the punctuation
            }
        }
    }
  }

  // Pri 4: space
  if (splitPos === -1) {
     const spaceRegex = /\s+/g;
     bestDist = Infinity;
     while ((match = spaceRegex.exec(text)) !== null) {
        if (match.index >= minPos && match.index <= maxPos) {
            const dist = Math.abs(match.index - targetPos);
            if (dist < bestDist) {
                bestDist = dist;
                splitPos = match.index;
            }
        }
    }
  }

  // Fallback: exact middle (though very rare)
  if (splitPos === -1) {
      splitPos = targetPos;
  }

  const part1 = text.substring(0, splitPos).trim();
  const part2 = text.substring(splitPos).trim();

  return [...smartHardSplit(part1, maxWords), ...smartHardSplit(part2, maxWords)];
}

export function generatePreview(text: string, kw: string, minWords: number, maxWords: number, splitRegex: RegExp | null): PreviewChapter[] {
  let textToSplit = text;
  let gutenbergHeader: PreviewChapter | null = null;
  let gutenbergFooter: PreviewChapter | null = null;

  const startMatch = textToSplit.match(/START OF THE PROJECT GUTENBERG/i);
  if (startMatch && startMatch.index !== undefined) {
    let endOfLineIdx = textToSplit.indexOf('\n', startMatch.index);
    if (endOfLineIdx === -1) endOfLineIdx = textToSplit.length;
    
    const headerText = textToSplit.substring(0, endOfLineIdx).trim();
    if (headerText) {
      gutenbergHeader = {
        title: 'Thông tin Project Gutenberg',
        previewText: headerText.substring(0, 100).trim() + '...',
        wordCount: countWords(headerText),
        originalText: headerText,
        excludeFromTranslation: true
      };
    }
    textToSplit = textToSplit.substring(endOfLineIdx).trim();
  }

  const endMatch = textToSplit.match(/END OF THE PROJECT GUTENBERG/i);
  if (endMatch && endMatch.index !== undefined) {
    let startOfLineIdx = textToSplit.lastIndexOf('\n', endMatch.index);
    if (startOfLineIdx === -1 || startOfLineIdx > endMatch.index) startOfLineIdx = endMatch.index;
    
    const footerText = textToSplit.substring(startOfLineIdx).trim();
    if (footerText) {
      gutenbergFooter = {
        title: 'Giấy phép Project Gutenberg',
        previewText: footerText.substring(0, 100).trim() + '...',
        wordCount: countWords(footerText),
        originalText: footerText,
        excludeFromTranslation: true
      };
    }
    textToSplit = textToSplit.substring(0, startOfLineIdx).trim();
  }

  if (kw === 'Toàn bộ file') {
    const mainChapter = {
      title: 'Nội dung sách',
      previewText: textToSplit.substring(0, 150) + '...',
      wordCount: countWords(textToSplit),
      originalText: textToSplit
    };
    
    const result = [];
    if (gutenbergHeader) result.push(gutenbergHeader);
    result.push(mainChapter);
    if (gutenbergFooter) result.push(gutenbergFooter);
    return result;
  }

  const processedMain = [];

  if (kw === 'Chia đều tự động' || !splitRegex) {
    const chunks = smartHardSplit(textToSplit, maxWords);
    for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        processedMain.push({
            title: `Phần ${i + 1}`,
            previewText: text.substring(0, 100).trim() + '...',
            wordCount: countWords(text),
            originalText: text
        });
    }
  } else {
    const splits = textToSplit.split(splitRegex);
    
    const rawChunks: {title: string, originalText: string}[] = [];
    
    const isHeadingMode = kw.startsWith('Thẻ H');

    if (splits[0].trim().length > 0) {
      rawChunks.push({
        title: isHeadingMode ? 'Phần đầu' : 'Mở đầu / Giới thiệu',
        originalText: splits[0].trim()
      });
    }

    for (let i = 1; i < splits.length; i += 2) {
      const rawTitle = splits[i];
      const title = rawTitle.replace(/^#+\s*/, '').replace(/\r?\n[-=]+\s*$/, '').trim();
      const content = splits[i + 1] ? splits[i + 1].trim() : '';
      const fullContent = splits[i] + '\n' + content;
      
      rawChunks.push({
        title,
        originalText: fullContent
      });
    }

    const MIN_WORDS = minWords;
    const mergedChapters: {titles: string[], originalText: string}[] = [];
    let currentAcc: {titles: string[], originalText: string} | null = null;

    for (const chunk of rawChunks) {
      if (!currentAcc) {
        currentAcc = { titles: [chunk.title], originalText: chunk.originalText };
      } else {
        const currentWords = countWords(currentAcc.originalText);
        if (currentWords < MIN_WORDS) {
          currentAcc.titles.push(chunk.title);
          currentAcc.originalText += '\n\n' + chunk.originalText;
        } else {
          mergedChapters.push(currentAcc);
          currentAcc = { titles: [chunk.title], originalText: chunk.originalText };
        }
      }
    }
    
    if (currentAcc) {
      const currentWords = countWords(currentAcc.originalText);
      const trailingThreshold = Math.min(2000, MIN_WORDS);

      if (currentWords < trailingThreshold && mergedChapters.length > 0) {
        const lastMerged = mergedChapters[mergedChapters.length - 1];
        lastMerged.titles.push(...currentAcc.titles);
        lastMerged.originalText += '\n\n' + currentAcc.originalText;
      } else {
        mergedChapters.push(currentAcc);
      }
    }

    // Now apply maxWords threshold to each chunk
    for (const c of mergedChapters) {
      const subChunks = smartHardSplit(c.originalText, maxWords);
      
      let finalTitle = c.titles[0];
      if (c.titles.length === 2) {
        finalTitle = `${c.titles[0]} & ${c.titles[1]}`;
      } else if (c.titles.length > 2) {
        finalTitle = `${c.titles[0]} ... ${c.titles[c.titles.length - 1]}`;
      }

      if (subChunks.length === 1) {
        const lines = subChunks[0].split('\n');
        const nonHeadingLines = lines.filter(l => !l.trim().startsWith('#') && l.trim().length > 0);
        const previewContent = nonHeadingLines.length > 0 ? nonHeadingLines.join(' ') : subChunks[0];
        const previewText = previewContent.substring(0, 100).trim() + '...';

        processedMain.push({
          title: finalTitle,
          previewText,
          wordCount: countWords(subChunks[0]),
          originalText: subChunks[0]
        });
      } else {
        for (let i = 0; i < subChunks.length; i++) {
          const text = subChunks[i];
          const lines = text.split('\n');
          const nonHeadingLines = lines.filter(l => !l.trim().startsWith('#') && l.trim().length > 0);
          const previewContent = nonHeadingLines.length > 0 ? nonHeadingLines.join(' ') : text;
          
          processedMain.push({
            title: `${finalTitle} (Phần ${i + 1})`,
            previewText: previewContent.substring(0, 100).trim() + '...',
            wordCount: countWords(text),
            originalText: text
          });
        }
      }
    }
  }

  if (processedMain.length === 1) {
    processedMain[0].title = 'Toàn bộ nội dung';
  }

  const finalResult = [];
  if (gutenbergHeader) finalResult.push(gutenbergHeader);
  finalResult.push(...processedMain);
  if (gutenbergFooter) finalResult.push(gutenbergFooter);

  return finalResult;
}

export function analyzeAndSplitText(
  text: string,
  minW: number,
  maxW: number,
  mode: 'keyword' | 'heading' | 'standalone',
  activeKw: string[],
  headingLevel: 'h2' | 'h3'
): SplitMethod[] {
  // First, add default "No split / Entire Book" method just in case
  const methods: SplitMethod[] = [{
    keyword: 'Toàn bộ file',
    count: 1,
    previewChapters: generatePreview(text, 'Toàn bộ file', minW, maxW, null)
  }];

  if (mode === 'standalone') {
    const previewChapters = generatePreview(text, 'Chia đều tự động', minW, maxW, null);
    methods.push({
      keyword: 'Chia đều tự động',
      count: previewChapters.length,
      previewChapters
    });
  } else if (mode === 'keyword') {
    for (const kw of activeKw) {
      const escapedKw = escapeRegExp(kw);
      const regex = new RegExp(`^(#*\\s*${escapedKw}\\s+.*)$`, 'gim');
      const matches = text.match(regex);
      
      if (matches && matches.length > 0) {
        const previewChapters = generatePreview(text, kw, minW, maxW, regex);
        methods.push({
          keyword: kw,
          count: previewChapters.length,
          previewChapters
        });
      }
    }
  } else if (mode === 'heading') {
    const level = headingLevel;
    const regexStr = level === 'h2' 
      ? '^((?:##\\s+.*)|(?:.+\\r?\\n[-=]+\\s*))$' 
      : '^(###\\s+.*)$';
    const regex = new RegExp(regexStr, 'gim');
    const matches = text.match(regex);
    
    if (matches && matches.length > 0) {
      const kw = `Thẻ ${level.toUpperCase()}`;
      const previewChapters = generatePreview(text, kw, minW, maxW, regex);
      methods.push({
        keyword: kw,
        count: previewChapters.length,
        previewChapters
      });
    }
  }
  
  return methods.sort((a,b) => b.count - a.count);
}
