import { marked } from 'marked';
import markedFootnote from 'marked-footnote';

let isConfigured = false;

export function getConfiguredMarked() {
  if (!isConfigured) {
    marked.use(markedFootnote());
    isConfigured = true;
  }
  return marked;
}
