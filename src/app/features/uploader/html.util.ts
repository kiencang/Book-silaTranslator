import TurndownService from 'turndown';

const turndownService = new TurndownService({ headingStyle: 'atx' }).remove(['style', 'script', 'head', 'meta', 'title', 'noscript']);

export function preprocessHtmlStr(htmlContent: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  const elements = doc.querySelectorAll('[style]');
  elements.forEach(node => {
    const el = node as HTMLElement;
    const styleAttr = el.getAttribute('style') || '';
    
    const isBold = /font-weight\s*:\s*(bold|bolder|[7-9]00)/i.test(styleAttr);
    const isItalic = /font-style\s*:\s*(italic|oblique)/i.test(styleAttr);
    
    if (isBold && el.tagName !== 'B' && el.tagName !== 'STRONG') {
      const b = doc.createElement('b');
      while (el.firstChild) {
        b.appendChild(el.firstChild);
      }
      el.appendChild(b);
    }
    
    if (isItalic && el.tagName !== 'I' && el.tagName !== 'EM') {
      const i = doc.createElement('i');
      while (el.firstChild) {
        i.appendChild(el.firstChild);
      }
      el.appendChild(i);
    }
  });

  return doc.body.innerHTML;
}

export async function processHtmlContent(file: File): Promise<string> {
  const text = await file.text();
  const processedHtml = preprocessHtmlStr(text);
  return turndownService.turndown(processedHtml);
}

export function getTurndownService(): TurndownService {
  return turndownService;
}
