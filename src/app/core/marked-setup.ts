import { marked } from 'marked';
import markedFootnote from 'marked-footnote';

declare global {
  interface Window {
    __SILA_IMAGES__?: Record<string, string>;
  }
}

let isConfigured = false;

export function getConfiguredMarked() {
  if (!isConfigured) {
    marked.use(markedFootnote());
    marked.use({
      renderer: {
        image(token) {
          let href = token.href;
          if (typeof window !== 'undefined' && window.__SILA_IMAGES__ && window.__SILA_IMAGES__[href]) {
             href = window.__SILA_IMAGES__[href];
          }
           // Use marked original logic or simple img tag
           let out = `<img src="${href}" alt="${token.text}"`;
           if (token.title) {
             out += ` title="${token.title}"`;
           }
           out += ' class="max-w-full h-auto rounded-lg" />';
           return out;
        }
      }
    });
    isConfigured = true;
  }
  return marked;
}
