import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

export function parseGeminiError(e: unknown): string {
  const msg = (e as Error)?.message || e?.toString() || '';
  if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('429')) {
    return 'Lỗi: Đã vượt quá giới hạn API miễn phí (Quota exceeded). Vui thử lại vào ngày mai hoặc đăng nhập tài khoản khác còn API miễn phí.';
  }
  if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('403') || msg.toLowerCase().includes('permission_denied')) {
    return 'Lỗi: Thao tác bị từ chối do API Key không hợp lệ hoặc thiếu quyền hạn (Permission Denied). Đợi một lúc rồi thử lại có thể giải quyết được vấn đề này.';
  }
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch failed')) {
    return 'Lỗi: Bị gián đoạn mạng. Vui lòng kiểm tra lại kết nối internet.';
  }
  if (msg.toLowerCase().includes('timeout')) {
    return 'Lỗi: Quá thời gian chờ (Timeout).';
  }
  if (msg.toLowerCase().includes('overloaded') || msg.toLowerCase().includes('503')) {
    return 'Lỗi: Máy chủ cung cấp AI đang quá tải, vui lòng thử lại sau một chút.';
  }
  
  // Try to parse json from msg if it's a raw google error
  try {
     let str = msg;
     if (str.includes('{')) {
       str = str.substring(str.indexOf('{'));
       const obj = JSON.parse(str);
       if (obj?.error?.message) {
         return `Lỗi từ AI: ${obj.error.message}`;
       }
     }
  } catch {
    // ignore parse error
  }

  return `Lỗi không xác định trong quá trình xử lý, vui lòng thử lại.`;
}

@Injectable({ providedIn: 'root' })
export class GeminiClient {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  private async loadPromptText(url: string): Promise<string | null> {
    const defaultOpts = { cache: 'no-store' as RequestCache };
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, defaultOpts);
      if (res.ok) return await res.text();
    } catch (e) {
      console.error(`Failed to load ${url}`, e);
    }
    return null;
  }

  async convertPdfToMarkdown(base64Data: string): Promise<string> {
    const pdfSI = await this.loadPromptText('/prompts/pdf_to_md_system_instruction.md');
    const pdfP = await this.loadPromptText('/prompts/pdf_to_md_prompt.md');

    const textPrompt = pdfP || 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text. Ignore images and header/footer elements like page numbers.';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      temperature: 0.1,
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };

    if (pdfSI) {
      configArgs.systemInstruction = pdfSI;
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-flash-latest',
      config: configArgs,
      contents: [
        { text: textPrompt },
        { inlineData: { data: base64Data, mimeType: 'application/pdf' } }
      ]
    });
    
    let result = response.text || '';
    if (result.startsWith('```markdown')) {
      result = result.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } else if (result.startsWith('```')) {
      result = result.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return result;
  }

  async translateChapter(text: string, model: string, temperature: number, bookTitle = '', author = '', pronounTable = '', usePronouns = false, glossaryTable = '', useGlossary = false): Promise<string> {
    let systemInstruction = null;
    let finalPrompt = '';
    
    if (usePronouns && useGlossary && pronounTable && glossaryTable) {
       systemInstruction = await this.loadPromptText('/prompts/multi_system_instructions.md');
       finalPrompt = await this.loadPromptText('/prompts/multi_pronouns_glossary_prompt.md') || '';
       if (finalPrompt) {
         finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
         finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
         finalPrompt = finalPrompt.replace('[bảng đại từ nhân xưng]', pronounTable);
         finalPrompt = finalPrompt.replace('[bảng thuật ngữ]', glossaryTable);
         finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
       }
    } else if (useGlossary && glossaryTable) {
       systemInstruction = await this.loadPromptText('/prompts/multi_system_instructions.md');
       finalPrompt = await this.loadPromptText('/prompts/multi_glossary_prompt.md') || '';
       if (finalPrompt) {
         finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
         finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
         finalPrompt = finalPrompt.replace('[bảng thuật ngữ]', glossaryTable);
         finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
       }
    } else if (usePronouns && pronounTable) {
       systemInstruction = await this.loadPromptText('/prompts/multi_system_instructions.md');
       finalPrompt = await this.loadPromptText('/prompts/multi_personal_pronouns_prompt.md') || '';
       if (finalPrompt) {
         finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
         finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
         finalPrompt = finalPrompt.replace('[bảng đại từ nhân xưng]', pronounTable);
         finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
       }
    } else {
       systemInstruction = await this.loadPromptText('/prompts/multi_system_instructions.md');
       finalPrompt = await this.loadPromptText('/prompts/multi_prompt.md') || '';
       if (finalPrompt) {
         finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
         finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
         finalPrompt = finalPrompt.replace('[nội dung cần dịch]', '\n' + text);
       } else {
         finalPrompt = `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}`;
       }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      temperature: temperature,
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };

    if (systemInstruction) {
      configArgs.systemInstruction = systemInstruction;
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

  async generatePronouns(text: string, model: string, bookTitle = '', author = ''): Promise<string> {
    const psi = await this.loadPromptText('/prompts/pronouns_system_instructions.md');
    const pp = await this.loadPromptText('/prompts/pronouns_prompt.md');

    let finalPrompt = pp || `Hãy phân tích đoạn văn bản nguồn dưới đây và lập Bảng đại từ nhân xưng chuẩn xác nhất.\n\n<metadata>\n- Tên sách: [tên sách]\n- Tác giả: [tên tác giả]\n</metadata>\n\n<source_text>\n[nội dung]\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('[nội dung]', text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };
    if (psi) {
       configArgs.systemInstruction = psi;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    return response.text || '';
  }

  async generateGlossary(text: string, bookTitle = '', author = ''): Promise<string> {
    const gsi = await this.loadPromptText('/prompts/glossary_system_instructions.md');
    const gp = await this.loadPromptText('/prompts/glossary_prompt.md');

    let finalPrompt = gp || `Hãy phân tích nội dung và trích xuất Bảng thuật ngữ chuyên ngành/Từ khó dịch tiếng Anh - Việt.\n\n<metadata>\n- Tên sách: [tên sách]\n- Tác giả: [tên tác giả]\n</metadata>\n\n<source_text>\n[nội dung]\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('[tên sách]', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('[tên tác giả]', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('[nội dung]', text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };
    if (gsi) {
       configArgs.systemInstruction = gsi;
    }

    const response = await this.ai.models.generateContent({
      model: 'gemini-pro-latest',
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    return response.text || '';
  }
}
