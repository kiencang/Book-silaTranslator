/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI, Type } from '@google/genai';
import { promises as fs } from 'fs';
import { join } from 'path';

// Helper to load prompt files from disk safely
async function loadPromptText(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  const urlParts = url.split('/');
  const filename = urlParts[urlParts.length - 1];
  
  const cwd = process.cwd();
  const possiblePaths = [
    join(cwd, 'public', 'prompts', filename),
    join(cwd, 'dist', 'app', 'browser', 'prompts', filename),
    join(cwd, 'public', filename),
    join(cwd, 'dist', 'app', 'browser', filename)
  ];

  for (const p of possiblePaths) {
    try {
      return await fs.readFile(p, 'utf-8');
    } catch {
      // try next
    }
  }
  return null;
}

// Function to construct GoogleGenAI client based on header API key or server fallback
function getAiClient(reqHeaderKey: string | string[] | undefined, defaultKey: string): GoogleGenAI {
  const finalKey = (typeof reqHeaderKey === 'string' && reqHeaderKey.trim() !== '') 
    ? reqHeaderKey.trim() 
    : defaultKey;

  return new GoogleGenAI({
    apiKey: finalKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

/**
 * Robustly parses and cleans JSON produced by LLMs.
 * Removes markdown block formatting, leading/trailing conversational texts, and trailing commas.
 */
function cleanJsonMarkdown(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Remove unicode BOM if any
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  // Use a regex to extract content from triple backticks if present
  const backtickRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = str.match(backtickRegex);
  if (match && match[1]) {
    str = match[1].trim();
  } else {
    // Try to strip any leading text before the first `[` or `{`
    // and any trailing text after the last `]` or `}`
    const firstBracket = Math.min(
      str.indexOf('[') === -1 ? Infinity : str.indexOf('['),
      str.indexOf('{') === -1 ? Infinity : str.indexOf('{')
    );
    const lastBracket = Math.max(
      str.lastIndexOf(']'),
      str.lastIndexOf('}')
    );
    
    if (firstBracket !== Infinity && lastBracket !== -1 && lastBracket > firstBracket) {
      str = str.substring(firstBracket, lastBracket + 1).trim();
    }
  }

  // Clean trailing commas: , followed by optional whitespace and a closing bracket or brace
  str = str.replace(/,(?=\s*[}\]])/g, '');

  return str;
}

export async function handleGeminiCall(req: any, res: any) {
  try {
    const { action, args = [] } = req.body;
    const reqHeaderKey = req.headers['x-user-api-key'];
    const defaultKey = process.env['GEMINI_API_KEY'] || '';
    
    // We instantiate the AI client dynamically on each call so that the x-user-api-key or fallback is correctly bound.
    const ai = getAiClient(reqHeaderKey, defaultKey);

    if (action === 'countTokens') {
      const [base64Data, mimeType = 'application/pdf', model = 'gemini-flash-lite-latest'] = args;
      const response = await ai.models.countTokens({
        model: model,
        contents: [
          { inlineData: { data: base64Data, mimeType } }
        ]
      });
      return res.json({ totalTokens: response.totalTokens || 0 });
    }

    if (action === 'convertPdfToMarkdown') {
      const [base64Data, model = 'gemini-flash-lite-latest'] = args;
      const pdfSI = await loadPromptText('/prompts/pdf_to_md_system_instruction.md');
      const pdfP = await loadPromptText('/prompts/pdf_to_md_prompt.md');

      const textPrompt = pdfP || 'You are an exact document converter. Convert the provided document into standard Markdown. Preserve all headings, lists, paragraphs, tables, and overall structure precisely without adding any extra conversational text. Ignore images and header/footer elements like page numbers.';

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      if (pdfSI) {
        configArgs.systemInstruction = pdfSI;
      }

      const response = await ai.models.generateContent({
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
      return res.json({ text: result });
    }

    if (action === 'filterGlossary') {
      const [text, glossaryTable] = args;
      const lines = glossaryTable.split('\n').filter((l: string) => l.trim().startsWith('|'));
      if (lines.length <= 2) {
        return res.json({ text: glossaryTable, usedCount: 0, totalCount: 0 });
      }

      const headers = lines[0].split('|').map((h: string) => h.trim()).filter((h: string) => h);
      if (headers.length < 4 || headers[0] !== 'Tiếng Anh') {
        return res.json({ text: glossaryTable, usedCount: 0, totalCount: 0 });
      }

      const fullGlossary: any[] = [];
      const compactList: any[] = [];
      
      for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').map((c: string) => c.trim());
        if (cells.length >= 5) {
           const english = cells[1];
           const pos = cells[2];
           const vietnamese = cells[3];
           const notes = cells[4];
           fullGlossary.push({ english, pos, vietnamese, notes });
           compactList.push({ english, pos });
        }
      }

      if (compactList.length <= 100) {
        return res.json({ text: glossaryTable, usedCount: compactList.length, totalCount: compactList.length });
      }

      const si = await loadPromptText('/prompts/filter_glossary_system_instruction.md') || 'You are an expert terminology extractor. Your task is to filter a given list of glossary terms and identify which ones are present in the provided text block. Return ONLY a valid JSON array of objects with "english" and "pos" properties.';
      let prompt = await loadPromptText('/prompts/filter_glossary_prompt.md');
      if (!prompt) {
        prompt = "Glossary Terms:\n{{danh sách thuật ngữ}}\n\nText Block:\n{{nội dung cần dịch}}";
      }
      
      prompt = prompt.replace('{{danh sách thuật ngữ}}', JSON.stringify(compactList));
      prompt = prompt.replace('{{nội dung cần dịch}}', text);

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

      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: [ { text: prompt } ],
        config: filterConfig
      });
      
      const resultText = response.text || '[]';
      let matchedItems: any[] = [];
      try {
        matchedItems = JSON.parse(cleanJsonMarkdown(resultText));
      } catch (e) {
        console.warn('Failed to parse filterGlossary JSON on server', e);
      }
      
      if (!Array.isArray(matchedItems) || matchedItems.length === 0) {
        return res.json({ text: '', usedCount: 0, totalCount: fullGlossary.length });
      }
      
      const matchedSet = new Set(matchedItems.map((item: any) => `${item.english}_${item.pos}`.toLowerCase()));
      const filteredGlossary = fullGlossary.filter(item => matchedSet.has(`${item.english}_${item.pos}`.toLowerCase()));
      
      if (filteredGlossary.length === 0) {
        return res.json({ text: '', usedCount: 0, totalCount: fullGlossary.length });
      }
      
      let resultTable = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
      for (const item of filteredGlossary) {
        resultTable += `| ${item.english} | ${item.pos} | ${item.vietnamese} | ${item.notes} |\n`;
      }
      
      return res.json({ text: resultTable, usedCount: filteredGlossary.length, totalCount: fullGlossary.length });
    }

    if (action === 'normalizePronouns') {
      const [text, rawPronounTable, model, bookTitle, author] = args;
      if (!rawPronounTable.trim()) {
        return res.json({ text: '' });
      }
      
      const si = await loadPromptText('/prompts/normalize_pronouns_system_instructions.md') || 'You are an expert context analyzer. Your task is to normalize and refine the provided raw pronoun table based on the full book content.';
      let prompt = await loadPromptText('/prompts/normalize_pronouns_prompt.md');
      if (!prompt) {
        prompt = "Raw Pronoun Table:\n{{bảng đại từ}}\n\nFull Book Content:\n{{nội dung}}\n\nPlease normalize it.";
      }
      
      prompt = prompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      prompt = prompt.replace('{{tên tác giả}}', author || 'Vô danh');
      prompt = prompt.replace('{{bảng đại từ}}', rawPronounTable);
      prompt = prompt.replace('{{nội dung}}', text);

      const filterConfig: any = {
        systemInstruction: si,
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      const response = await ai.models.generateContent({
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
      
      return res.json({ text: result });
    }

    if (action === 'translateChapter') {
      const [
        text, model, bookTitle = '', author = '', pronounTable = '', 
        usePronouns = false, glossaryTable = '', useGlossary = false, 
        shouldFilterGlossary = true, contextSummary, customInstructions
      ] = args;

      let activeGlossary = '';
      let glossaryStatus: 'none' | 'full' | 'filtered' = 'none';
      let glossaryRatio: number | undefined = undefined;

      if (useGlossary && glossaryTable) {
        if (shouldFilterGlossary) {
          const lines = glossaryTable.split('\n').filter((l: string) => l.trim().startsWith('|'));
          if (lines.length > 2) {
            const headers = lines[0].split('|').map((h: string) => h.trim()).filter((h: string) => h);
            if (headers.length >= 4 && headers[0] === 'Tiếng Anh') {
              const fullGlossary: any[] = [];
              const compactList: any[] = [];
              for (let i = 2; i < lines.length; i++) {
                const cells = lines[i].split('|').map((c: string) => c.trim());
                if (cells.length >= 5) {
                   fullGlossary.push({ english: cells[1], pos: cells[2], vietnamese: cells[3], notes: cells[4] });
                   compactList.push({ english: cells[1], pos: cells[2] });
                }
              }

              if (compactList.length <= 100) {
                activeGlossary = glossaryTable;
                glossaryStatus = 'full';
                glossaryRatio = 100;
              } else {
                const si = await loadPromptText('/prompts/filter_glossary_system_instruction.md') || 'You are an expert terminology extractor. Your task is to filter a given list of glossary terms and identify which ones are present in the provided text block. Return ONLY a valid JSON array of objects with "english" and "pos" properties.';
                let prompt = await loadPromptText('/prompts/filter_glossary_prompt.md');
                if (!prompt) {
                  prompt = "Glossary Terms:\n{{danh sách thuật ngữ}}\n\nText Block:\n{{nội dung cần dịch}}";
                }
                
                prompt = prompt.replace('{{danh sách thuật ngữ}}', JSON.stringify(compactList));
                prompt = prompt.replace('{{nội dung cần dịch}}', text);

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

                const filterResponse = await ai.models.generateContent({
                  model: 'gemini-flash-lite-latest',
                  contents: [ { text: prompt } ],
                  config: filterConfig
                });
                
                const resultText = filterResponse.text || '[]';
                let matchedItems: any[] = [];
                try {
                  matchedItems = JSON.parse(cleanJsonMarkdown(resultText));
                } catch (e) {
                  console.warn('Failed to parse translateChapter filter JSON on server', e);
                }
                
                if (Array.isArray(matchedItems) && matchedItems.length > 0) {
                  const matchedSet = new Set(matchedItems.map((item: any) => `${item.english}_${item.pos}`.toLowerCase()));
                  const filteredGlossary = fullGlossary.filter(item => matchedSet.has(`${item.english}_${item.pos}`.toLowerCase()));
                  if (filteredGlossary.length > 0) {
                    let resultTable = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
                    for (const item of filteredGlossary) {
                      resultTable += `| ${item.english} | ${item.pos} | ${item.vietnamese} | ${item.notes} |\n`;
                    }
                    activeGlossary = resultTable;
                    glossaryStatus = 'filtered';
                    glossaryRatio = Math.round((filteredGlossary.length / fullGlossary.length) * 100);
                  }
                }
              }
            }
          }
        } else {
          activeGlossary = glossaryTable;
          glossaryStatus = 'full';
          glossaryRatio = 100;
        }
      }

      const systemInstruction = await loadPromptText('/prompts/multi_system_instructions.md');
      let finalPrompt = await loadPromptText('/prompts/multi_prompt.md') || '';
      
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
        finalPrompt = finalPrompt.replace(/\n\s*\n\s*\n/g, '\n\n');
      } else {
        finalPrompt = `Translate the following text into Vietnamese. Maintain the original Markdown formatting and structure. Do not add any conversational text.\n\n${text}`;
      }

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      if (systemInstruction) {
        configArgs.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          { text: finalPrompt }
        ],
        config: configArgs
      });
      
      let result = response.text || '';
      if (result.startsWith('```markdown')) {
        result = result.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      } else if (result.startsWith('```')) {
        result = result.replace(/^```\n/, '').replace(/\n```$/, '');
      }
      
      return res.json({ 
        text: result, 
        customGlossary: activeGlossary || undefined, 
        glossaryStatus, 
        glossaryRatio 
      });
    }

    if (action === 'generatePronouns') {
      const [text, model, bookTitle = '', author = ''] = args;
      const psi = await loadPromptText('/prompts/pronouns_system_instructions.md');
      const pp = await loadPromptText('/prompts/pronouns_prompt.md');

      let finalPrompt = pp || `Hãy phân tích đoạn văn bản nguồn dưới đây và lập Bảng đại từ nhân xưng chuẩn xác nhất.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
      
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('{{nội dung}}', text);

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json'
      };
      if (psi) {
         configArgs.systemInstruction = psi;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ text: finalPrompt }],
        config: configArgs
      });

      const result = response.text || '';
      let arr: any[] = [];
      try {
        arr = JSON.parse(cleanJsonMarkdown(result));
      } catch (e) {
        console.warn('Failed to parse generatePronouns raw JSON on server', e);
      }

      if (Array.isArray(arr) && arr.length > 0) {
        let md = '| Nhân vật (Original) | Giới tính | Ước lượng độ tuổi | Đặc điểm & Vai trò | Xưng hô / Tước vị (Dịch) | Ngôi thứ 3 (Narrator) | Xưng - Hô (Với người khác) | Lý do | Ghi chú |\n|---|---|---|---|---|---|---|---|---|\n';
        for (const pt of arr) {
          md += `| ${pt.originalName || ''} | ${pt.gender || ''} | ${pt.ageGroup || ''} | ${pt.role || ''} | ${pt.translatedTitles || ''} | ${pt.narratorPronoun || ''} | ${pt.dialoguePronouns || ''} | ${pt.reasoning || ''} | ${pt.notes || ''} |\n`;
        }
        return res.json({ text: md });
      }
      return res.json({ text: '' });
    }

    if (action === 'generatePronounsRaw') {
      const [text, model, bookTitle = '', author = ''] = args;
      const psi = await loadPromptText('/prompts/pronouns_system_instructions.md');
      const pp = await loadPromptText('/prompts/pronouns_prompt.md');

      let finalPrompt = pp || `Hãy phân tích đoạn văn bản nguồn dưới đây và lập Bảng đại từ nhân xưng chuẩn xác nhất.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
      
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('{{nội dung}}', text);

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json'
      };
      if (psi) {
         configArgs.systemInstruction = psi;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ text: finalPrompt }],
        config: configArgs
      });

      const result = response.text || '';
      let arr: any[] = [];
      try {
        arr = JSON.parse(cleanJsonMarkdown(result));
      } catch (e) {
        console.warn('Failed to parse generatePronounsRaw JSON on server', e);
      }
      return res.json({ array: arr });
    }

    if (action === 'generateGlossary') {
      const [text, model, bookTitle = '', author = ''] = args;
      const gsi = await loadPromptText('/prompts/glossary_system_instructions.md');
      const gp = await loadPromptText('/prompts/glossary_prompt.md');

      let finalPrompt = gp || `Hãy phân tích nội dung và trích xuất Bảng thuật ngữ chuyên ngành/Từ khó dịch tiếng Anh - Việt.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
      
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('{{nội dung}}', text);

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json'
      };

      if (gsi) {
         configArgs.systemInstruction = gsi;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ text: finalPrompt }],
        config: configArgs
      });

      const result = response.text || '';
      let arr: any[] = [];
      try {
        arr = JSON.parse(cleanJsonMarkdown(result));
      } catch (e) {
        console.warn('Failed to parse generateGlossary raw JSON on server', e);
      }

      if (Array.isArray(arr) && arr.length > 0) {
        let md = '| Tiếng Anh | Từ loại | Tiếng Việt | Ghi chú văn cảnh |\n|---|---|---|---|\n';
        for (const pt of arr) {
          md += `| ${pt.english || ''} | ${pt.pos || ''} | ${pt.vietnamese || ''} | ${pt.contextNotes || ''} |\n`;
        }
        return res.json({ text: md });
      }
      return res.json({ text: '' });
    }

    if (action === 'generateGlossaryRaw') {
      const [text, model, bookTitle = '', author = ''] = args;
      const gsi = await loadPromptText('/prompts/glossary_system_instructions.md');
      const gp = await loadPromptText('/prompts/glossary_prompt.md');

      let finalPrompt = gp || `Hãy phân tích nội dung và trích xuất Bảng thuật ngữ chuyên ngành/Từ khó dịch tiếng Anh - Việt.\n\n<metadata>\n- Tên sách: {{tên sách}}\n- Tác giả: {{tên tác giả}}\n</metadata>\n\n<source_text>\n{{nội dung}}\n</source_text>`;
      
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('{{nội dung}}', text);

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json'
      };

      if (gsi) {
         configArgs.systemInstruction = gsi;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ text: finalPrompt }],
        config: configArgs
      });

      const result = response.text || '';
      let arr: any[] = [];
      try {
        arr = JSON.parse(cleanJsonMarkdown(result));
      } catch (e) {
        console.warn('Failed to parse generateGlossaryRaw JSON on server', e);
      }
      return res.json({ array: arr });
    }

    if (action === 'analyzeBook') {
      const [text, model, bookTitle = '', author = ''] = args;
      const si = await loadPromptText('/prompts/book_analysis_system_instructions.md');
      const p = await loadPromptText('/prompts/book_analysis_prompt.md');

      let finalPrompt = p || `Phân tích văn bản và trả về JSON cấu hình theo yêu cầu.\n\n<source_text>\n{{nội dung}}\n</source_text>`;
      
      finalPrompt = finalPrompt.replace('{{tên sách}}', bookTitle || 'Không rõ');
      finalPrompt = finalPrompt.replace('{{tên tác giả}}', author || 'Vô danh');
      finalPrompt = finalPrompt.replace('{{nội dung}}', text);

      const configArgs: any = {
        thinkingConfig: { thinkingLevel: 'HIGH' },
        responseMimeType: 'application/json'
      };

      if (si) {
         configArgs.systemInstruction = si;
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: [{ text: finalPrompt }],
        config: configArgs
      });

      const result = response.text || '';
      const cleaned = cleanJsonMarkdown(result);
      return res.json({ text: cleaned });
    }

    if (action === 'summarizeTranslation') {
      const [translatedText, model] = args;
      if (!translatedText.trim()) {
        return res.json({ text: '' });
      }

      const si = await loadPromptText('/prompts/summary_system_instruction.md');
      const p = await loadPromptText('/prompts/summary_prompt.md');

      const systemInstruction = si || 'You are an expert summarizer for a translation workflow...';
      const promptTemplate = p || 'Hãy tóm tắt nội dung bản dịch dưới đây...';
      const finalPrompt = promptTemplate.replace('{{nội dung}}', translatedText);

      const configArgs: any = {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingLevel: 'HIGH' }
      };

      const response = await ai.models.generateContent({
        model: model,
        contents: [ { text: finalPrompt } ],
        config: configArgs
      });
      
      return res.json({ text: (response.text || '').trim() });
    }

    return res.status(400).json({ error: { message: `Hành động '${action}' không được nhận diện` } });

  } catch (error: any) {
    console.error('Server side Gemini API error:', error);
    const errMsg = error.message || String(error);
    return res.status(500).json({
      error: {
        message: errMsg
      }
    });
  }
}
