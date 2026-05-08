import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({ providedIn: 'root' })
export class GeminiClient {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  async convertPdfToMarkdown(base64Data: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-flash-latest',
      config: {
        thinkingConfig: { thinkingLevel: 'HIGH' }
      } as any,
      contents: [
        { text: 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text.' },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
      ]
    });
    return response.text || '';
  }

  private systemInstructionCache: string | null = null;
  private promptCache: string | null = null;
  private pronounsMultiPromptCache: string | null = null;
  
  private pronounsSystemInstructionCache: string | null = null;
  private pronounsPromptCache: string | null = null;

  async loadPrompts() {
    const defaultOpts = { cache: 'no-store' as RequestCache };
    const loadFile = async (url: string) => {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, defaultOpts);
        if (res.ok) return await res.text();
      } catch (e) {
        console.error(`Failed to load ${url}`, e);
      }
      return null;
    };

    const [si, p, pm, psi, pp] = await Promise.all([
      loadFile('/prompts/multi_system_instructions.md'),
      loadFile('/prompts/multi_prompt.md'),
      loadFile('/prompts/multi_personal_pronouns_prompt.md'),
      loadFile('/prompts/pronouns_system_instructions.md'),
      loadFile('/prompts/pronouns_prompt.md')
    ]);

    this.systemInstructionCache = si;
    this.promptCache = p;
    this.pronounsMultiPromptCache = pm;
    this.pronounsSystemInstructionCache = psi;
    this.pronounsPromptCache = pp;
  }

  async translateChapter(text: string, model: string, temperature: number, bookTitle: string = '', author: string = '', pronounTable: string = '', usePronouns: boolean = false): Promise<string> {
    await this.loadPrompts();

    let finalPrompt = '';
    
    if (usePronouns && this.pronounsMultiPromptCache && pronounTable) {
       finalPrompt = this.pronounsMultiPromptCache;
       finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
       finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
       finalPrompt = finalPrompt.replace('[bảng đại từ nhân xưng]', pronounTable);
       finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
    } else if (this.promptCache) {
       finalPrompt = this.promptCache;
       finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
       finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
       finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
    } else {
       finalPrompt = `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}`;
    }

    const configArgs: any = {
      temperature: temperature,
      thinkingConfig: { thinkingLevel: 'HIGH' }
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

  async generatePronouns(text: string, model: string, bookTitle: string = '', author: string = ''): Promise<string> {
    await this.loadPrompts();

    let finalPrompt = this.pronounsPromptCache || `Hãy phân tích đoạn văn bản nguồn dưới đây và lập Bảng đại từ nhân xưng chuẩn xác nhất.\n\n<metadata>\n- Tên sách: [tên sách]\n- Tác giả: [tên tác giả]\n</metadata>\n\n<source_text>\n[nội dung]\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('[nội dung]', text);

    const configArgs: any = {
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };
    if (this.pronounsSystemInstructionCache) {
       configArgs.systemInstruction = this.pronounsSystemInstructionCache;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    return response.text || '';
  }
}
