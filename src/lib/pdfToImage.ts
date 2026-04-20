/**
 * Renders the first page of a PDF file to a PNG data URL using PDF.js.
 * The canvas is sized to the exact PDF page dimensions so the resulting
 * image can be used as a pixel-perfect template background.
 */
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

// Point PDF.js at its bundled web worker via Vite's ?url import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfPageInfo {
  /** PNG data URL of the rendered first page */
  dataUrl: string;
  /** Page width in points (pt) */
  widthPt: number;
  /** Page height in points (pt) */
  heightPt: number;
  /** "portrait" or "landscape" based on page dimensions */
  orientation: "portrait" | "landscape";
  /** Total number of pages */
  pageCount: number;
}

/**
 * Load a PDF from an ArrayBuffer and render its first page to a PNG.
 *
 * @param buffer   Raw PDF bytes
 * @param scale    Render scale factor (2 = 2× resolution for crisp display)
 */
export async function pdfFirstPageToImage(
  buffer: ArrayBuffer,
  scale = 2
): Promise<PdfPageInfo> {
  const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Gagal membuat canvas 2D context. Coba tutup tab lain untuk membebaskan memori.");

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Unscaled dimensions in points (1 pt = 1/72 inch)
  const rawViewport = page.getViewport({ scale: 1 });
  const widthPt = rawViewport.width;
  const heightPt = rawViewport.height;

  return {
    dataUrl: canvas.toDataURL("image/png"),
    widthPt,
    heightPt,
    orientation: widthPt >= heightPt ? "landscape" : "portrait",
    pageCount: pdf.numPages,
  };
}
