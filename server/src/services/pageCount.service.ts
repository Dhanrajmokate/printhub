import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

export interface PageCountResult {
  pageCount: number;
  fileType: string;
  isExact: boolean;
}

export async function detectPageCount(filePath: string): Promise<PageCountResult> {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const pageCount = pdfData.numpages && pdfData.numpages > 0 ? pdfData.numpages : 1;
      return {
        pageCount,
        fileType: 'pdf',
        isExact: true
      };
    }

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return {
        pageCount: 1,
        fileType: 'image',
        isExact: true
      };
    }

    if (ext === '.txt') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').length;
      const chars = content.length;
      // Approximate 50 lines or 3000 chars per standard printed A4 page
      const estimatedPages = Math.max(1, Math.ceil(Math.max(lines / 50, chars / 3000)));
      return {
        pageCount: estimatedPages,
        fileType: 'text',
        isExact: false
      };
    }

    if (['.docx', '.doc'].includes(ext)) {
      // Word documents: estimate based on file size and word stream heuristic
      const stats = fs.statSync(filePath);
      // Rough estimation: ~25KB per formatted page
      const estimatedPages = Math.max(1, Math.ceil(stats.size / 25000));
      return {
        pageCount: Math.min(estimatedPages, 50),
        fileType: 'word',
        isExact: false
      };
    }

    return {
      pageCount: 1,
      fileType: 'other',
      isExact: false
    };
  } catch (error) {
    console.warn(`[PageCount] Failed to parse page count for ${filePath}, defaulting to 1:`, error);
    return {
      pageCount: 1,
      fileType: ext.replace('.', ''),
      isExact: false
    };
  }
}
