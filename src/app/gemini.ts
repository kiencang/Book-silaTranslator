import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({ providedIn: 'root' })
export class GeminiClient {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  async convertPdfToMarkdown(base64Data: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        { text: 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text.' },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
      ]
    });
    return response.text || '';
  }

  private systemInstructionCache: string | null = null;
  private promptCache: string | null = null;

  async loadPrompts() {
    if (!this.systemInstructionCache) {
      try {
        const res = await fetch('/prompts/multi_system_instructions.md');
        if (res.ok) this.systemInstructionCache = await res.text();
      } catch (e) {
        console.error('Failed to load system instructions', e);
      }
    }
    if (!this.promptCache) {
      try {
        const res = await fetch('/prompts/multi_prompt.md');
        if (res.ok) this.promptCache = await res.text();
      } catch (e) {
        console.error('Failed to load user prompt', e);
      }
    }
  }

  async translateChapter(text: string, model: string, temperature: number, bookTitle: string = '', author: string = ''): Promise<string> {
    await this.loadPrompts();

    let finalPrompt = this.promptCache || `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}`;
    
    if (this.promptCache) {
      finalPrompt = finalPrompt.replace('[Tên sách, phải điền]', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('[Tên tác giả, phải điền]', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('[Dán nội dung sách bằng Markdown vào đây...]', '\n' + text);
    }

    const configArgs: any = {
      temperature: temperature
    };

    if (this.systemInstructionCache) {
      configArgs.systemInstruction = this.systemInstructionCache;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [
        { text: finalPrompt }
      ],
      config: configArgs
    });
    
    let result = response.text || '';
    
    // Remove formatting tokens if AI happens to return them wrapping the content
    if (result.startsWith('```markdown')) {
      result = result.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } else if (result.startsWith('```')) {
      result = result.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return result;
  }
}
