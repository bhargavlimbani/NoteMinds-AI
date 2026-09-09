import { PDFParse } from 'pdf-parse';
import { cleanText } from './text.js';
import { AppError } from './AppError.js';

/** Extract plain text from a PDF buffer. */
export async function extractPdfText(buffer: Buffer): Promise<{ text: string; pages: number }> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = cleanText(result.text ?? '');
    return { text, pages: result.total ?? result.pages?.length ?? 0 };
  } catch (error) {
    throw AppError.badRequest('Could not read this PDF. Make sure it is a valid, non-encrypted PDF file.', {
      cause: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
