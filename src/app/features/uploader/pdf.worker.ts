/// <reference lib="webworker" />

import { PDFDocument } from 'pdf-lib';

addEventListener('message', async ({ data }) => {
  const { type, payload, id } = data;

  try {
    if (type === 'COUNT_PAGES') {
      const { arrayBuffer } = payload;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const count = pdfDoc.getPageCount();
      postMessage({ type: 'SUCCESS', id, payload: { count } });
    } else if (type === 'CHUNK_PDF') {
      const { arrayBuffer, start, end, chunkSize } = payload;
      
      const originalPdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pdfDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await pdfDoc.copyPages(originalPdfDoc, pageIndices);
      copiedPages.forEach((page) => pdfDoc.addPage(page));
      
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount <= chunkSize) {
         // Cắt thành 1 file duy nhất (nhỏ)
         const base64 = await pdfDoc.saveAsBase64();
         const b64Data = base64.includes(',') ? base64.split(',')[1] : base64;
         postMessage({ type: 'SUCCESS', id, payload: { resultType: 'single', b64Data } });
      } else {
         // Cắt thành nhiều file (lớn)
         const chunks = [];
         for (let i = 0; i < pageCount; i += chunkSize) {
            const endPage = Math.min(i + chunkSize, pageCount) - 1;
            const newPdf = await PDFDocument.create();
            const chunkIndices = Array.from({ length: endPage - i + 1 }, (_, k) => k + i);
            const copiedPages = await newPdf.copyPages(pdfDoc, chunkIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));
            const chunkData = await newPdf.save();
            
            chunks.push({
               index: i / chunkSize,
               pdfData: chunkData
            });
         }
         postMessage({ type: 'SUCCESS', id, payload: { resultType: 'chunks', chunks } });
      }
    } else if (type === 'EXTRACT_TOKEN_PAGES') {
      const { arrayBuffer, start, end } = payload;
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      
      const b64Data = await newPdf.saveAsBase64();
      postMessage({ type: 'SUCCESS', id, payload: { b64Data } });
    }

  } catch (error) {
    postMessage({ type: 'ERROR', id, payload: { error: error instanceof Error ? error.message : String(error) } });
  }
});
