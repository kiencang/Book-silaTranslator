import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({ providedIn: 'root' })
export class GeminiClient {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  async convertPdfToMarkdown(base64Data: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { text: 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text.' },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
      ]
    });
    return response.text || '';
  }

  async translateChapter(text: string, model: string, temperature: number): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: model,
      contents: [
        { text: `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}` }
      ],
      config: {
        temperature: temperature
      }
    });
    return response.text || '';
  }
}
