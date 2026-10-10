import mammoth from 'mammoth';
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Trích xuất văn bản từ mảng byte của tệp Word 97-2003 (.doc)
 * Sử dụng giải mã UTF-16LE và trích xuất các chuỗi câu/đoạn văn bản tiếng Việt hợp lệ
 */
export function extractTextFromDocBinary(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    let text16 = '';
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if (code >= 32 && code <= 65533) {
        text16 += String.fromCharCode(code);
      } else if (code === 10 || code === 13) {
        text16 += '\n';
      } else {
        text16 += '\x00';
      }
    }

    const chunks: string[] = [];
    const lines = text16.split(/[\r\n\x00]+/);
    for (const line of lines) {
      const clean = line.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim();
      if (clean.length >= 10 && /\p{L}{3,}/u.test(clean)) {
        chunks.push(clean);
      }
    }

    if (chunks.length > 0) {
      return chunks.join('\n');
    }

    // Fallback: Thử giải mã UTF-8 trực tiếp nếu file lưu ở dạng XML/text
    const textUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
    const utf8Lines = textUtf8.split(/[\r\n\x00]+/);
    const utf8Chunks: string[] = [];
    for (const line of utf8Lines) {
      const clean = line.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim();
      if (clean.length >= 10 && /\p{L}{3,}/u.test(clean)) {
        utf8Chunks.push(clean);
      }
    }
    return utf8Chunks.join('\n');
  } catch (err) {
    console.warn('[documentExtractor] Error extracting text from .doc binary:', err);
    return '';
  }
}

/**
 * Trích xuất văn bản từ tệp Word OpenXML (.docx)
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value ? result.value.trim() : '';
  } catch (err) {
    console.warn('[documentExtractor] Error extracting text from .docx via mammoth:', err);
    // Fallback trích xuất binary nếu mammoth gặp lỗi cấu trúc
    return extractTextFromDocBinary(arrayBuffer);
  }
}

/**
 * Trích xuất văn bản từ tệp PDF cơ bản
 */
export function extractTextFromPdfBinary(arrayBuffer: ArrayBuffer): string {
  try {
    const raw = new TextDecoder('latin1').decode(arrayBuffer);
    const chunks: string[] = [];
    const textBlockRegex = /BT[\s\S]*?ET/g;
    let match;

    while ((match = textBlockRegex.exec(raw)) !== null) {
      const block = match[0];
      const stringMatches = block.match(/\((.*?)\)\s*(?:Tj|'|")/g);
      if (stringMatches) {
        for (const sm of stringMatches) {
          const content = sm.replace(/^\(/, '').replace(/\)\s*(?:Tj|'|")$/, '').trim();
          if (content.length > 2) {
            chunks.push(content);
          }
        }
      }
    }

    if (chunks.length > 0) {
      return chunks.join(' ');
    }

    // Fallback: Tìm các dòng ký tự chữ đọc được
    const printableLines = raw.split(/[\r\n]+/);
    const validLines: string[] = [];
    for (const l of printableLines) {
      const clean = l.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').trim();
      if (clean.length >= 15 && /\p{L}{4,}/u.test(clean)) {
        validLines.push(clean);
      }
    }
    return validLines.slice(0, 500).join('\n');
  } catch (err) {
    console.warn('[documentExtractor] Error extracting text from PDF:', err);
    return '';
  }
}

/**
 * Chuyển Base64 string thành ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Phân tích và trích xuất nội dung văn bản từ một ArrayBuffer dựa vào tên tệp
 */
export async function extractTextFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  const lowerName = (fileName || '').toLowerCase();

  if (lowerName.endsWith('.docx')) {
    return extractTextFromDocx(arrayBuffer);
  }

  if (lowerName.endsWith('.doc')) {
    return extractTextFromDocBinary(arrayBuffer);
  }

  if (lowerName.endsWith('.pdf')) {
    return extractTextFromPdfBinary(arrayBuffer);
  }

  // Tệp văn bản thuần: .txt, .md, .csv, .json, .log
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer).trim();
  } catch {
    return extractTextFromDocBinary(arrayBuffer);
  }
}

/**
 * Tải tệp từ liên kết URL từ xa (Azure Blob, HTTP/HTTPS) và tự động trích xuất toàn bộ văn bản
 */
export async function extractTextFromRemoteUrl(
  url: string,
  fileName?: string
): Promise<string> {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return '';
  }

  try {
    const effectiveName = fileName || url.split('/').pop()?.split('?')[0] || 'document.docx';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[documentExtractor] Failed to fetch remote document: status ${res.status}`);
      return '';
    }

    const arrayBuffer = await res.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return '';
    }

    return await extractTextFromArrayBuffer(arrayBuffer, effectiveName);
  } catch (err) {
    console.warn('[documentExtractor] Error downloading & extracting remote document:', err);
    return '';
  }
}

/**
 * Trích xuất toàn bộ văn bản từ tệp lưu cục bộ trên thiết bị qua URI (Expo FileSystem)
 */
export async function extractTextFromFileUri(
  fileUri: string,
  fileName: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.csv')) {
    try {
      return await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch {
      // fallback base64
    }
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = base64ToArrayBuffer(base64);
    return await extractTextFromArrayBuffer(arrayBuffer, fileName);
  } catch (err) {
    console.warn('[documentExtractor] Error reading file from URI:', err);
    return '';
  }
}

/**
 * Định dạng cấu trúc hoàn chỉnh cho AI hiểu rõ nguồn gốc tài liệu và nội dung bài học
 */
export function formatExtractedDocumentContent(
  fileName: string,
  rawText: string,
  metadata?: {
    courseTitle?: string;
    lessonTitle?: string;
    fileType?: string;
    sizeBytes?: number;
    fileUrl?: string;
  }
): string {
  const sizeKb = metadata?.sizeBytes ? (metadata.sizeBytes / 1024).toFixed(1) : 'N/A';
  const cleanContent = rawText.trim();

  return [
    `=== TÀI LIỆU HỌC TẬP CHÍNH THỨC ===`,
    `Tên tệp: ${fileName}`,
    `Khóa học: ${metadata?.courseTitle || 'Chưa xác định'}`,
    `Bài học: ${metadata?.lessonTitle || 'Chưa xác định'}`,
    `Loại tệp: ${metadata?.fileType || fileName.split('.').pop()?.toUpperCase() || 'Tài liệu'}`,
    `Dung lượng: ${sizeKb} KB`,
    metadata?.fileUrl ? `Đường dẫn tài liệu: ${metadata.fileUrl}` : '',
    `Thời gian gắn: ${new Date().toLocaleString('vi-VN')}`,
    `--- NỘI DUNG VĂN BẢN TRÍCH XUẤT TỪ TỆP ---`,
    cleanContent.length > 0
      ? cleanContent
      : `[Không thể trích xuất văn bản từ tệp này hoặc tệp là hình ảnh quét không có lớp chữ.]`,
    `=== HẾT TÀI LIỆU: ${fileName} ===`,
  ]
    .filter(Boolean)
    .join('\n');
}
