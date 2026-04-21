/**
 * Helpers buat upload foto/dokumen ke Supabase Storage, agency-scoped.
 * Path convention: `{agency_id}/{file}` (RLS storage policy enforce).
 */
import { supabase, isSupabaseConfigured } from "./supabase";
import { requireAgencyId } from "@/store/authStore";

const PHOTO_BUCKET = "jamaah-photos";
const DOC_BUCKET = "jamaah-docs";

function dataUrlToBlob(dataUrl: string): { blob: Blob; contentType: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const contentType = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: contentType }), contentType };
}

function extFromContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("pdf")) return "pdf";
  return "bin";
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "file";
}

/** Upload foto jamaah ke bucket, return public URL. Skip jika input udah URL. */
export async function uploadJamaahPhoto(
  jamaahId: string,
  passportNumber: string,
  dataUrl: string,
): Promise<string> {
  if (!isSupabaseConfigured()) return dataUrl;
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const parsed = dataUrlToBlob(dataUrl);
  if (!parsed) return dataUrl;
  const agencyId = requireAgencyId();
  const ext = extFromContentType(parsed.contentType);
  const base = passportNumber ? safeName(passportNumber) : safeName(jamaahId);
  const path = `${agencyId}/${base}_${Date.now()}.${ext}`;
  const { error } = await supabase!.storage.from(PHOTO_BUCKET).upload(path, parsed.blob, {
    upsert: true, contentType: parsed.contentType,
  });
  if (error) {
    console.error("[storage] upload photo failed", error);
    return dataUrl;
  }
  const { data } = supabase!.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload dokumen jamaah ke bucket, return public URL. */
export async function uploadJamaahDoc(
  jamaahId: string,
  category: string,
  fileName: string,
  dataUrl: string,
): Promise<string> {
  if (!isSupabaseConfigured()) return dataUrl;
  if (!dataUrl.startsWith("data:")) return dataUrl;
  const parsed = dataUrlToBlob(dataUrl);
  if (!parsed) return dataUrl;
  const agencyId = requireAgencyId();
  const ext = extFromContentType(parsed.contentType);
  const base = `${safeName(jamaahId)}_${safeName(category)}_${safeName(fileName.replace(/\.[^.]+$/, ""))}`;
  const path = `${agencyId}/${base}_${Date.now()}.${ext}`;
  const { error } = await supabase!.storage.from(DOC_BUCKET).upload(path, parsed.blob, {
    upsert: true, contentType: parsed.contentType,
  });
  if (error) {
    console.error("[storage] upload doc failed", error);
    return dataUrl;
  }
  const { data } = supabase!.storage.from(DOC_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Cek string adalah base64 data URL. */
export function isDataUrl(s: string | undefined | null): boolean {
  return typeof s === "string" && s.startsWith("data:");
}
