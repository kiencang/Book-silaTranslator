import TurndownService from 'turndown';
import { preprocessHtmlStr } from './html.util';

export async function processEpubContent(file: File, turndownService: TurndownService): Promise<{ markdown: string, images?: Record<string, string> }> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const buffer = await file.arrayBuffer();
  try {
    await zip.loadAsync(buffer);
  } catch (error: any) {
    throw new Error(`Đã xảy ra lỗi khi đọc file EPUB. File có thể bị lỗi, chưa tải xuống hoàn tất hoặc không đúng định dạng zip: ${error.message}`);
  }
  
  // 1. Read META-INF/container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('File không đúng chuẩn EPUB (thiếu META-INF/container.xml)');
  const containerXml = await containerFile.async('text');
  
  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  // Using getElementsByTagName to avoid namespace issues
  const rootfileNode = containerDoc.getElementsByTagName('rootfile')[0];
  if (!rootfileNode) throw new Error('File không đúng chuẩn EPUB (thiếu rootfile)');
  
  const opfPath = rootfileNode.getAttribute('full-path');
  if (!opfPath) throw new Error('File không đúng chuẩn EPUB (thiếu đường dẫn OPF)');
  
  // Get base path of OPF to resolve relative paths
  const lastSlashIndex = opfPath.lastIndexOf('/');
  const opfBasePath = lastSlashIndex !== -1 ? opfPath.substring(0, lastSlashIndex + 1) : '';
  
  // 2. Read OPF file
  const opfFile = zip.file(opfPath);
  if (!opfFile) throw new Error('File không đúng chuẩn EPUB (không tìm thấy tệp OPF)');
  const opfXml = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfXml, 'application/xml');
  
  // 3. Get manifest items
  const manifestItems = opfDoc.getElementsByTagName('item');
  const itemsMap = new Map<string, string>(); // id -> href
  
  const imagesStore: Record<string, string> = {};
  const hrefToImgId = new Map<string, string>();
  let imgCounter = 0;
  
  for (let i = 0; i < manifestItems.length; i++) {
    const item = manifestItems[i];
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    
    if (id && href) itemsMap.set(id, href);
    
    // Check if it's an image
    if (href && mediaType && mediaType.startsWith('image/')) {
       const imgFilePath = opfBasePath + decodeURIComponent(href);
       const imgFile = zip.file(imgFilePath);
       if (imgFile) {
          const base64Data = await imgFile.async('base64');
          const dataUrl = `data:${mediaType};base64,${base64Data}`;
          const placeholderId = `SILA_IMG_${imgCounter++}`;
          imagesStore[placeholderId] = dataUrl;
          hrefToImgId.set(href, placeholderId);
       }
    }
  }
  
  // 4. Get spine items
  const spineItems = opfDoc.getElementsByTagName('itemref');
  
  let fullMarkdown = '';
  
  for (let i = 0; i < spineItems.length; i++) {
      const idref = spineItems[i].getAttribute('idref');
      if (!idref) continue;
      
      const href = itemsMap.get(idref);
      if (!href) continue;
      
      let decodedHref = decodeURIComponent(href);
      const filePath = opfBasePath + decodedHref;
      
      const htmlFile = zip.file(filePath);
      if (!htmlFile) continue;
      
      const htmlContent = await htmlFile.async('text');
      let processedHtml = preprocessHtmlStr(htmlContent);
      
      // Replace image src in HTML
      const pDoc = parser.parseFromString(processedHtml, 'text/html');
      const imgs = pDoc.getElementsByTagName('img');
      for (let j = 0; j < imgs.length; j++) {
         const src = imgs[j].getAttribute('src');
         if (src) {
             // src might be relative to the html file, e.g. `../images/cover.jpg`
             // we need to resolve it relative to OPF base path
             // OPF base path `OEBPS/` + HTML file path `text/chap1.html`
             // Let's resolve the path relative to html file path
             let resolvedPath = '';
             let htmlDirPath = decodedHref.substring(0, decodedHref.lastIndexOf('/') + 1);
             // handle ../ and ./
             let parts = (htmlDirPath + src).split('/');
             let finalParts: string[] = [];
             for (let p of parts) {
                 if (p === '..') finalParts.pop();
                 else if (p !== '.' && p !== '') finalParts.push(p);
             }
             let finalHref = finalParts.join('/');
             // check if it's in our map
             const placeholderId = hrefToImgId.get(finalHref);
             if (placeholderId) {
                imgs[j].setAttribute('src', placeholderId);
             }
         }
      }
      processedHtml = pDoc.body.innerHTML || pDoc.documentElement.innerHTML;
      
      const markdown = turndownService.turndown(processedHtml);
      if (markdown.trim()) {
          fullMarkdown += (fullMarkdown ? '\n\n---\n\n' : '') + markdown;
      }
  }
  
  if (!fullMarkdown) {
     throw new Error('Không trích xuất được nội dung từ file EPUB. Có thể file rỗng hoặc mã hóa không hỗ trợ.');
  }
  
  return { markdown: fullMarkdown, images: Object.keys(imagesStore).length > 0 ? imagesStore : undefined };
}
