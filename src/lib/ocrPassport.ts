import { createWorker } from "tesseract.js";

export interface PassportData {
  name?: string;
  passportNumber?: string;
  nationality?: string;
  birthDate?: string;
  expiryDate?: string;
  gender?: "L" | "P";
}

/**
 * Progress phases — mapped to a continuous 0-100 range:
 *   0-10%  : loading tesseract core
 *  10-15%  : initializing tesseract
 *  15-30%  : loading language traineddata
 *  30-35%  : initializing api
 *  35-100% : recognizing text
 */
function mapProgress(status: string, rawProgress: number): number {
  const p = Math.max(0, Math.min(1, rawProgress));
  switch (status) {
    case "loading tesseract core":
      return Math.round(p * 10);
    case "initializing tesseract":
      return Math.round(10 + p * 5);
    case "loading language traineddata":
      return Math.round(15 + p * 15);
    case "initializing api":
      return Math.round(30 + p * 5);
    case "recognizing text":
      return Math.round(35 + p * 65);
    default:
      return Math.round(p * 35);
  }
}

/**
 * Convert File/Blob to a base64 data URL.
 */
function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Preprocess the passport image for better MRZ OCR:
 * - Crop the bottom 32% where the MRZ strip lives
 * - Scale up 2× for finer detail
 * - Convert to high-contrast black-and-white
 */
function preprocessForMRZ(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // --- Step 1: Crop bottom 32% ---
        const cropH = Math.round(img.height * 0.32);
        const cropY = img.height - cropH;

        const crop = document.createElement("canvas");
        crop.width = img.width;
        crop.height = cropH;
        const cCtx = crop.getContext("2d")!;
        cCtx.drawImage(img, 0, cropY, img.width, cropH, 0, 0, img.width, cropH);

        // --- Step 2: Grayscale + contrast stretch + binary threshold ---
        const id = cCtx.getImageData(0, 0, crop.width, crop.height);
        const d = id.data;

        // Find min/max brightness for contrast stretch
        let minB = 255, maxB = 0;
        for (let i = 0; i < d.length; i += 4) {
          const b = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          if (b < minB) minB = b;
          if (b > maxB) maxB = b;
        }
        const range = maxB - minB || 1;

        for (let i = 0; i < d.length; i += 4) {
          const b = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const stretched = ((b - minB) / range) * 255;
          const val = stretched > 127 ? 255 : 0;
          d[i] = d[i + 1] = d[i + 2] = val;
          d[i + 3] = 255;
        }
        cCtx.putImageData(id, 0, 0);

        // --- Step 3: Scale up 2× (crisper text for Tesseract) ---
        const out = document.createElement("canvas");
        out.width = crop.width * 2;
        out.height = crop.height * 2;
        const oCtx = out.getContext("2d")!;
        oCtx.imageSmoothingEnabled = false;
        oCtx.drawImage(crop, 0, 0, out.width, out.height);

        resolve(out.toDataURL("image/png"));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Fix common OCR character confusions in MRZ numeric positions.
 * O→0, I→1, S→5, Z→2, B→8
 */
function fixNumericZone(s: string): string {
  return s
    .replace(/O/g, "0")
    .replace(/I/g, "1")
    .replace(/S/g, "5")
    .replace(/Z/g, "2")
    .replace(/B/g, "8");
}

/**
 * Clean a raw OCR line to only contain valid MRZ characters.
 */
function cleanLine(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9<]/g, "<");
}

/**
 * Extract the two MRZ lines from raw OCR text.
 * TD3 passport: each line is exactly 44 characters.
 */
function extractMRZLines(text: string): [string, string] | null {
  const lines = text
    .split("\n")
    .map(cleanLine)
    .filter((l) => l.length >= 36);

  const candidates = lines
    .map((l) => (l.length < 44 ? l.padEnd(44, "<") : l.slice(0, 44)))
    .filter((l) => /^[A-Z0-9<]{44}$/.test(l));

  if (candidates.length >= 2) {
    const l1idx = candidates.findIndex((l) => l.startsWith("P"));
    if (l1idx !== -1 && l1idx + 1 < candidates.length) {
      return [candidates[l1idx], candidates[l1idx + 1]];
    }
    return [candidates[0], candidates[1]];
  }

  const fallback = lines
    .map((l) => (l.length < 44 ? l.padEnd(44, "<") : l.slice(0, 44)));
  if (fallback.length >= 2) return [fallback[0], fallback[1]];

  return null;
}

function parseMRZ(text: string): PassportData {
  const pair = extractMRZLines(text);
  if (!pair) return {};

  const [line1, line2] = pair;
  const result: PassportData = {};

  try {
    // ── Passport number (line2 [0..8]) ──
    const passportRaw = line2.slice(0, 9).replace(/</g, "");
    if (passportRaw.length >= 5) result.passportNumber = passportRaw;

    // ── Nationality (line2 [10..12]) ──
    const nat = line2.slice(10, 13).replace(/</g, "");
    if (nat.length >= 2) result.nationality = nat;

    // ── Date of birth (line2 [13..18]) ──
    const dobRaw = fixNumericZone(line2.slice(13, 19));
    if (/^\d{6}$/.test(dobRaw)) {
      const yy = parseInt(dobRaw.slice(0, 2));
      const mm = dobRaw.slice(2, 4);
      const dd = dobRaw.slice(4, 6);
      const yyyy = yy > 30 ? 1900 + yy : 2000 + yy;
      result.birthDate = `${yyyy}-${mm}-${dd}`;
    }

    // ── Sex (line2 [20]) ──
    const sex = line2[20];
    if (sex === "M") result.gender = "L";
    else if (sex === "F") result.gender = "P";

    // ── Expiry date (line2 [21..26]) ──
    const expRaw = fixNumericZone(line2.slice(21, 27));
    if (/^\d{6}$/.test(expRaw)) {
      const yy = parseInt(expRaw.slice(0, 2));
      const mm = expRaw.slice(2, 4);
      const dd = expRaw.slice(4, 6);
      const yyyy = 2000 + yy;
      result.expiryDate = `${yyyy}-${mm}-${dd}`;
    }

    // ── Name (line1 [5..43]) ──
    const namePart = line1.slice(5, 44);
    const sepIdx = namePart.indexOf("<<");
    let fullName = "";
    if (sepIdx !== -1) {
      const surname = namePart.slice(0, sepIdx).replace(/</g, " ").trim();
      const given = namePart.slice(sepIdx + 2).replace(/</g, " ").replace(/\s+/g, " ").trim();
      fullName = given ? `${given} ${surname}`.trim() : surname;
    } else {
      fullName = namePart.replace(/</g, " ").trim();
    }

    if (fullName.length > 2) result.name = fullName;
  } catch {
    // ignore parse errors
  }

  return result;
}

export async function scanPassport(
  imageSource: string | File,
  onProgress?: (pct: number) => void
): Promise<PassportData> {
  const dataUrl =
    imageSource instanceof File || imageSource instanceof Blob
      ? await fileToDataUrl(imageSource)
      : imageSource;

  const processed = await preprocessForMRZ(dataUrl);

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.progress !== undefined) {
        onProgress(mapProgress(m.status, m.progress));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: "6" as never,
    });

    const { data: r1 } = await worker.recognize(processed);
    let result = parseMRZ(r1.text);

    if (!result.passportNumber && !result.name) {
      await worker.setParameters({
        tessedit_pageseg_mode: "11" as never,
      });
      const { data: r2 } = await worker.recognize(dataUrl);
      result = parseMRZ(r2.text);
    }

    if (onProgress) onProgress(100);
    return result;
  } finally {
    await worker.terminate();
  }
}
