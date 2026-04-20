import { createWorker } from "tesseract.js";

export interface PassportData {
  name?: string;
  passportNumber?: string;
  nationality?: string;
  birthDate?: string;
  expiryDate?: string;
  gender?: "L" | "P";
}

function parseMRZ(text: string): PassportData {
  const lines = text
    .toUpperCase()
    .split("\n")
    .map((l) => l.replace(/\s/g, "").trim())
    .filter((l) => l.length >= 30);

  const mrzLines = lines.filter((l) => /^[A-Z0-9<]{30,}$/.test(l));
  if (mrzLines.length < 2) return {};

  const line1 = mrzLines[0];
  const line2 = mrzLines[1];

  const result: PassportData = {};

  try {
    const passportNum = line2.slice(0, 9).replace(/</g, "");
    if (passportNum.length >= 5) result.passportNumber = passportNum;

    const dob = line2.slice(13, 19);
    if (/^\d{6}$/.test(dob)) {
      const year = parseInt(dob.slice(0, 2));
      const month = dob.slice(2, 4);
      const day = dob.slice(4, 6);
      const fullYear = year > 30 ? 1900 + year : 2000 + year;
      result.birthDate = `${fullYear}-${month}-${day}`;
    }

    const sex = line2[20];
    if (sex === "M") result.gender = "L";
    else if (sex === "F") result.gender = "P";

    const namePart = line1.slice(5).replace(/</g, " ").trim();
    const nameClean = namePart.replace(/\s{2,}/g, " | ").trim();
    if (nameClean.length > 2) result.name = nameClean.replace(" | ", " ");
  } catch {
  }

  return result;
}

export async function scanPassport(
  imageSource: string | File,
  onProgress?: (pct: number) => void
): Promise<PassportData> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
      tessedit_pageseg_mode: "6" as never,
    });

    const { data } = await worker.recognize(imageSource);
    return parseMRZ(data.text);
  } finally {
    await worker.terminate();
  }
}
