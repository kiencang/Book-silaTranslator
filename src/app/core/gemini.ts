import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export function isQuotaError(e: unknown): boolean {
  const msg = (e as Error)?.message || e?.toString() || '';
  const lowerMsg = msg.toLowerCase();
  return lowerMsg.includes('quota') || lowerMsg.includes('429') || lowerMsg.includes('resource_exhausted');
}

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
  private getApiKey(): string {
    if (typeof window !== 'undefined') {
      const userKey = localStorage.getItem('user_gemini_api_key');
      if (userKey && userKey.trim()) {
        return userKey.trim();
      }
    }
    return GEMINI_API_KEY;
  }

  private get ai(): GoogleGenAI {
    return new GoogleGenAI({ 
      apiKey: this.getApiKey(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  private async loadPromptText(url: string): Promise<string | null> {
    const defaultOpts: RequestInit = { 
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    try {
      const res = await fetch(`${url}?t=${Date.now()}`, defaultOpts);
      if (res.ok) return await res.text();
    } catch (e) {
      console.error(`Failed to load ${url}`, e);
    }
    return null;
  }

  async countTokens(base64Data: string, mimeType = 'application/pdf', model = 'gemini-flash-lite-latest'): Promise<number> {
    try {
      const response = await this.ai.models.countTokens({
        model: model,
        contents: [
          { inlineData: { data: base64Data, mimeType } }
        ]
      });
      return response.totalTokens || 0;
    } catch (e) {
      console.error('Failed to count tokens', e);
      return 0;
    }
  }

  async convertPdfToMarkdown(base64Data: string, model = 'gemini-flash-lite-latest'): Promise<string> {
    const pdfSI = await this.loadPromptText('/prompts/pdf_to_md_system_instruction.md');
    const pdfP = await this.loadPromptText('/prompts/pdf_to_md_prompt.md');

    const textPrompt = pdfP || 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text. Ignore images and header/footer elements like page numbers.';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      thinkingConfig: { thinkingLevel: 'HIGH' }
    };

    if (pdfSI) {
      configArgs.systemInstruction = pdfSI;
    }

    const response = await this.ai.models.generateContent({
      model: model,
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

  async filterGlossary(text: string, glossaryTable: string): Promise<{ text: string; usedCount: number; totalCount: number }> {
    try {
      const lines = glossaryTable.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length <= 2) return { text: glossaryTable, usedCount: 0, totalCount: 0 };

      const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
      if (headers.length < 4 || headers[0] !== 'Tiếng Anh') return { text: glossaryTable, usedCount: 0, totalCount: 0 };

      const fullGlossary: { english: string; pos: string; vietnamese: string; notes: string }[] = [];
      const compactList: { english: string; pos: string }[] = [];
      
      for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map(c => c.trim());
        if (cells.length >= 5) {
           const english = cells[1];
           const pos = cells[2];
           const vietnamese = cells[3];
           const notes = cells[4];
           fullGlossary.push({ english, pos, vietnamese, notes });
           compactList.push({ english, pos });
        }
      }

      if (compactList.length <= 100) return { text: glossaryTable, usedCount: compactList.length, totalCount: compactList.length };

      const si = await this.loadPromptText('/prompts/filter_glossary_system_instruction.md') || 'You are an expert terminology extractor. Your task is to filter a given list of glossary terms and identify which ones are present in the provided text block. Return ONLY a valid JSON array of objects with "english" and "pos" properties.';
      let prompt = await this.loadPromptText('/prompts/filter_glossary_prompt.md');
      if (!prompt) {
        prompt = "Glossary Terms:\n{{danh sách thuật ngữ}}\n\nText Block:\n{{nội dung cần dịch}}";
      }
      
      prompt = prompt.replace('{{danh sách thuật ngữ}}', JSON.stringify(compactList));
      prompt = prompt.replace('{{nội dung cần dịch}}', text);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filterConfig: any = {
        systemInstruction: si,
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING },
              pos: { type: Type.STRING }
            },
            required: ["english", "pos"]
          }
        }
      };

      const response = await this.ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: [ { text: prompt } ],
        config: filterConfig
      });
      
      const resultText = response.text || '[]';
      const matchedItems = JSON.parse(resultText);
      
      if (!Array.isArray(matchedItems) || matchedItems.length === 0) {
        return { text: '', usedCount: 0, totalCount: fullGlossary.length };
      }
      
      const matchedSet = new Set(matchedItems.map((item: any) => `${item.english}_${item.pos}`.toLowerCase()));
      const filteredGlossary = fullGlossary.filter(item => matchedSet.has(`${item.english}_${item.pos}`.toLowerCase()));
      
      if (filteredGlossary.length === 0) return { text: '', usedCount: 0, totalCount: fullGlossary.length };
      
      let resultTable = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
      for (const item of filteredGlossary) {
        resultTable += `| ${item.english} | ${item.pos} | ${item.vietnamese} | ${item.notes} |\n`;
      }
      
      return { text: resultTable, usedCount: filteredGlossary.length, totalCount: fullGlossary.length };
      
    } catch (e) {
      console.error('Failed to filter glossary', e);
      return { text: glossaryTable, usedCount: 0, totalCount: 0 }; 
    }
  }

  async normalizePronouns(text: string, rawPronounTable: string, model: string, bookTitle: string, author: string): Promise<string> {
    try {
      if (!rawPronounTable.trim()) return '';
      
      const si = await this.loadPromptText('/prompts/normalize_pronouns_system_instructions.md') || 'You are an expert context analyzer. Your task is to normalize and refine the provided raw pronoun table based on the full book content.';
      let prompt = await this.loadPromptText('/prompts/normalize_pronouns_prompt.md');
      if (!prompt) {
        prompt = "Raw Pronoun Table:\n{{bảng đại từ}}\n\nFull Book Content:\n{{nội dung}}\n\nPlease normalize it.";
      }
      
      prompt = prompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      prompt = prompt.replace('{{tên tác giả}}', author || 'Vô danh');
      prompt = prompt.replace('{{bảng đại từ}}', rawPronounTable);
      prompt = prompt.replace('{{nội dung}}', text);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filterConfig: any = {
        systemInstruction: si,
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      const response = await this.ai.models.generateContent({
        model: model,
        contents: [ { text: prompt } ],
        config: filterConfig
      });
      
      let result = response.text || '';
      if (result.startsWith('```markdown')) {
        result = result.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return result;
      
    } catch (e) {
      console.error('Failed to normalize pronouns', e);
      return rawPronounTable; 
    }
  }

  async translateChapter(text: string, model: string, bookTitle = '', author = '', pronounTable = '', usePronouns = false, glossaryTable = '', useGlossary = false, shouldFilterGlossary = true, contextSummary?: string, customInstructions?: string): Promise<{text: string, customGlossary?: string, glossaryStatus?: 'none' | 'full' | 'filtered', glossaryRatio?: number}> {
    
    let activeGlossary = '';
    let glossaryStatus: 'none' | 'full' | 'filtered' = 'none';
    let glossaryRatio: number | undefined = undefined;

    if (useGlossary && glossaryTable) {
        if (shouldFilterGlossary) {
            const filterRes = await this.filterGlossary(text, glossaryTable);
            activeGlossary = filterRes.text;
            glossaryStatus = activeGlossary === glossaryTable ? 'full' : 'filtered';
            if (filterRes.totalCount > 0) {
              glossaryRatio = Math.round((filterRes.usedCount / filterRes.totalCount) * 100);
            }
        } else {
            activeGlossary = glossaryTable;
            glossaryStatus = 'full';
            glossaryRatio = 100;
        }
    }
    
    const systemInstruction = await this.loadPromptText('/prompts/multi_system_instructions.md');
    let finalPrompt = await this.loadPromptText('/prompts/multi_prompt.md') || '';
    
    if (finalPrompt) {
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      
      if (usePronouns && pronounTable) {
        const pronounBlock = `<pronouns_rules>\n**Bảng đại từ nhân xưng:**\n${pronounTable}\n\n*LƯU Ý: Ở trên là Bảng đại từ nhân xưng tham chiếu. Bạn BẮT BUỘC phải sử dụng cấu trúc xưng hô này cho cách người kể chuyện gọi nhân vật (ngôi thứ 3) và trong các cuộc hội thoại thông thường. TUY NHIÊN, bạn được phép điều chỉnh linh hoạt cách xưng hô (ngôi thứ 1 & 2) nếu bối cảnh cảm xúc của câu chuyện thực sự đòi hỏi sự chuyển đổi.*\n</pronouns_rules>`;
        finalPrompt = finalPrompt.replace('{{đại từ nhân xưng}}', pronounBlock);
      } else {
        finalPrompt = finalPrompt.replace('{{đại từ nhân xưng}}', '');
      }

      if (activeGlossary) {
        const glossaryBlock = `<glossary_rules>\n**Bảng thuật ngữ / Từ khó:**\n${activeGlossary}\n\n*LƯU Ý: Bảng thuật ngữ trên đây là một DANH SÁCH THAM KHẢO quan trọng, NHƯNG bạn hãy áp dụng LINH HOẠT các thuật ngữ này vào bản dịch để đảm bảo tính thống nhất chuyên môn/từ ngữ toàn cục của cuốn sách. Điều cần ghi nhớ là đừng ép buộc áp dụng một cách cứng nhắc nếu ngữ cảnh cụ thể của đoạn văn hoàn toàn khác.*\n</glossary_rules>`;
        finalPrompt = finalPrompt.replace('{{thuật ngữ}}', glossaryBlock);
      } else {
        finalPrompt = finalPrompt.replace('{{thuật ngữ}}', '');
      }

      if (contextSummary) {
         const contextBlock = `<previous_chunk_handoff>\n**Tóm tắt bối cảnh từ phần trước để tham khảo:**\n${contextSummary}\n\n*LƯU Ý: Đây là thông tin nối tiếp từ khối văn bản trước (diễn biến sự kiện, trạng thái nhân vật, hoặc luồng logic/lập luận). Hãy dùng nó để nắm bắt ngữ cảnh nhằm đảm bảo tính liền mạch cho bản dịch. TUYỆT ĐỐI KHÔNG lặp lại nội dung tóm tắt này vào phần bản dịch.*\n</previous_chunk_handoff>`;
         finalPrompt = finalPrompt.replace('{{tóm tắt bối cảnh}}', contextBlock);
      } else {
         finalPrompt = finalPrompt.replace('{{tóm tắt bối cảnh}}', '');
      }

      if (customInstructions) {
         const instructionsBlock = `<custom_instructions>\n**Chỉ thị bổ sung khi dịch:**\n${customInstructions}\n</custom_instructions>`;
         finalPrompt = finalPrompt.replace('{{chỉ thị bổ sung}}', instructionsBlock);
      } else {
         finalPrompt = finalPrompt.replace('{{chỉ thị bổ sung}}', '');
      }

      finalPrompt = finalPrompt.replace('{{nội dung cần dịch}}', '\n' + text);
      
      // Clean up multiple newlines that might arise from empty replacements
      finalPrompt = finalPrompt.replace(/\n\s*\n\s*\n/g, '\n\n');
    } else {
      finalPrompt = `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
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
    
    return { text: result, customGlossary: activeGlossary || undefined, glossaryStatus, glossaryRatio };
  }

  async generatePronounsRaw(text: string, model: string, bookTitle = '', author = ''): Promise<any[]> {
    const psi = await this.loadPromptText('/prompts/pronouns_system_instructions.md');
    const pp = await this.loadPromptText('/prompts/pronouns_prompt.md');

    let finalPrompt = pp || `Hãy phân tích đoạn văn bản nguồn dưới đây và lập Bảng đại từ nhân xưng chuẩn xác nhất.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('{{nội dung}}', text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      thinkingConfig: { thinkingLevel: 'HIGH' },
      responseMimeType: 'application/json'
    };
    if (psi) {
       configArgs.systemInstruction = psi;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    let result = response.text || '';
    if (result.startsWith('```json')) {
      result = result.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (result.startsWith('```')) {
      result = result.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const arr = JSON.parse(result);
      if (Array.isArray(arr)) {
        return arr;
      }
    } catch (e) {
      console.warn('Failed to parse generatePronounsRaw JSON', e);
    }
    return [];
  }

  async generatePronouns(text: string, model: string, bookTitle = '', author = ''): Promise<string> {
    const arr = await this.generatePronounsRaw(text, model, bookTitle, author);
    if (arr.length > 0) {
      let md = '| Nhân vật (Original) | Giới tính | Ước lượng độ tuổi | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Lý do | Ghi chú |\n|---|---|---|---|---|---|---|---|---|\n';
      for (const pt of arr) {
        md += `| ${pt.originalName || ''} | ${pt.gender || ''} | ${pt.ageGroup || ''} | ${pt.role || ''} | ${pt.translatedTitles || ''} | ${pt.narratorPronoun || ''} | ${pt.dialoguePronouns || ''} | ${pt.reasoning || ''} | ${pt.notes || ''} |\n`;
      }
      return md;
    }
    return '';
  }

  async generateGlossaryRaw(text: string, model: string, bookTitle = '', author = ''): Promise<any[]> {
    const gsi = await this.loadPromptText('/prompts/glossary_system_instructions.md');
    const gp = await this.loadPromptText('/prompts/glossary_prompt.md');

    let finalPrompt = gp || `Hãy phân tích nội dung và trích xuất Bảng thuật ngữ chuyên ngành/Từ khó dịch tiếng Anh - Việt.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('{{nội dung}}', text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      thinkingConfig: { thinkingLevel: 'HIGH' },
      responseMimeType: 'application/json'
    };

    if (gsi) {
       configArgs.systemInstruction = gsi;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    let result = response.text || '';
    if (result.startsWith('```json')) {
      result = result.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (result.startsWith('```')) {
      result = result.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    try {
      const arr = JSON.parse(result);
      if (Array.isArray(arr)) {
        return arr;
      }
    } catch (e) {
      console.warn('Failed to parse generateGlossaryRaw JSON', e);
    }
    return [];
  }

  async generateGlossary(text: string, model: string, bookTitle = '', author = ''): Promise<string> {
    const arr = await this.generateGlossaryRaw(text, model, bookTitle, author);
    if (arr.length > 0) {
      let md = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
      for (const pt of arr) {
        md += `| ${pt.english || ''} | ${pt.pos || ''} | ${pt.vietnamese || ''} | ${pt.contextNotes || ''} |\n`;
      }
      return md;
    }
    return '';
  }

  async analyzeBook(text: string, model: string, bookTitle = '', author = ''): Promise<string> {
    const si = await this.loadPromptText('/prompts/book_analysis_system_instructions.md');
    const p = await this.loadPromptText('/prompts/book_analysis_prompt.md');

    let finalPrompt = p || `Phân tích văn bản và trả về JSON cấu hình theo yêu cầu.\n\n<source_text>\n{{nội dung}}\n</source_text>`;
    
    finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
    finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
    finalPrompt = finalPrompt.replace('{{nội dung}}', text);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configArgs: any = {
      thinkingConfig: { thinkingLevel: 'HIGH' },
      responseMimeType: 'application/json'
    };

    if (si) {
       configArgs.systemInstruction = si;
    }

    const response = await this.ai.models.generateContent({
      model: model,
      contents: [{ text: finalPrompt }],
      config: configArgs
    });

    let result = response.text || '';
    if (result.startsWith('```json')) {
      result = result.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (result.startsWith('```')) {
      result = result.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return result.trim();
  }

  async summarizeTranslation(translatedText: string, model: string): Promise<string> {
    try {
      if (!translatedText.trim()) return '';

      const si = await this.loadPromptText('/prompts/summary_system_instruction.md');
      const p = await this.loadPromptText('/prompts/summary_prompt.md');

      const systemInstruction = si || 'You are an expert summarizer for a translation workflow. Your task is to summarize the provided translated chapter/block (Vietnamese text). The summary MUST be concise (not exceeding 10% of the original text length) and MUST focus on providing contextual information for translating the NEXT chapter/block (e.g., key plot progression, character state changes, new places, or important items mentioned). The summary MUST be in Vietnamese.';
      const promptTemplate = p || 'Hãy tóm tắt nội dung bản dịch dưới đây để làm thông tin bối cảnh (context) cho việc dịch phần tiếp theo. Yêu cầu:\n- Độ dài không vượt quá 10% nội dung gốc.\n- Tập trung vào các diễn biến chính, trạng thái nhân vật, địa điểm, hoặc sự kiện quan trọng có thể ảnh hưởng đến phần sau.\n\nNội dung bản dịch:\n{{nội dung}}';
      
      const finalPrompt = promptTemplate.replace('{{nội dung}}', translatedText);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configArgs: any = {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      const response = await this.ai.models.generateContent({
        model: model,
        contents: [ { text: finalPrompt } ],
        config: configArgs
      });
      
      return (response.text || '').trim();
    } catch (e) {
      console.error('Failed to summarize translation', e);
      return '';
    }
  }
}
