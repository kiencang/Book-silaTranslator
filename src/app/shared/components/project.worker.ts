/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {
  const { type, payload, id } = data;

  try {
    if (type === 'EXPORT_PROJECT') {
      const fullProject = payload;
      
      // Convert Uint8Array back to base64 for JSON serialization
      if (fullProject.pdfTask && fullProject.pdfTask.chunks) {
        // Can't use FileReader in standard worker easily if it's not supported, 
        // but we can use standard JS to base64 convert Uint8Array
        // Actually, FileReader Sync might not be available, we can use a helper function.
        
        fullProject.pdfTask.chunks = fullProject.pdfTask.chunks.map((chunk: { pdfData?: Uint8Array | Record<string, number>; base64Pdf?: string; [key: string]: unknown }) => {
          if (chunk.pdfData) {
            let base64 = "";
            let uint8Array: Uint8Array | null = null;
            
            if (chunk.pdfData instanceof Uint8Array || (chunk.pdfData as { buffer?: ArrayBuffer }).buffer) {
               uint8Array = chunk.pdfData as Uint8Array;
            } else {
               uint8Array = new Uint8Array(Object.values(chunk.pdfData));
            }
            
            if (uint8Array) {
               // Use standard loop for large arrays if needed, but chunk is 30 pages so it might be up to 1-5MB.
               // A standard btoa(String.fromCharCode.apply(null, arr)) will crash with "Maximum call stack size exceeded".
               // Let's process in chunks or use standard loop
               let binary = '';
               const len = uint8Array.byteLength;
               for (let i = 0; i < len; i++) {
                  binary += String.fromCharCode(uint8Array[i]);
               }
               base64 = self.btoa(binary);
               
               chunk.base64Pdf = base64;
               delete chunk.pdfData; // clear old data to save space in JSON
            }
          }
          return chunk;
        });
      }
      
      const jsonStr = JSON.stringify(fullProject, null, 2);
      postMessage({ type: 'SUCCESS', id, payload: { jsonStr } });
      
    } else if (type === 'IMPORT_PROJECT') {
      const { text } = payload;
      const proj = JSON.parse(text);
      
      if (proj && proj.pdfTask && proj.pdfTask.chunks) {
         for (const chunk of proj.pdfTask.chunks) {
           let base64 = null;
           
           if (chunk.base64Pdf) {
             base64 = chunk.base64Pdf;
             delete chunk.base64Pdf;
           } else if (chunk.pdfData && typeof chunk.pdfData === 'string') {
             base64 = chunk.pdfData;
           } else if (chunk.pdfData && typeof chunk.pdfData === 'object') {
             // In case someone exports an object format
             chunk.pdfData = new Uint8Array(Object.values(chunk.pdfData));
           }

           if (base64) {
             // Use browser native API fetch to parse base64 extremely fast
             const response = await fetch(`data:application/pdf;base64,${base64}`);
             const arrayBuffer = await response.arrayBuffer();
             chunk.pdfData = new Uint8Array(arrayBuffer);
           }
         }
      }
      
      postMessage({ type: 'SUCCESS', id, payload: { project: proj } });
    }

  } catch (error) {
    postMessage({ type: 'ERROR', id, payload: { error: error instanceof Error ? error.message : String(error) } });
  }
});
