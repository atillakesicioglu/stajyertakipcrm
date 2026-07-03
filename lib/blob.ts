import { put } from "@vercel/blob";
import { getAppSettings } from "@/lib/queries/app-settings";

export type UploadResult = { url: string; name: string };

function getBlobToken(): string | undefined {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return token || undefined;
}

async function validateScreenshot(file: File): Promise<void> {
  const settings = await getAppSettings();
  const allowedTypes = settings.allowedFileTypes;
  const maxSize = settings.maxFileSizeMb * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      "Bu dosya tipi izin verilmiyor. İzinli tipler: " +
        allowedTypes.join(", ")
    );
  }
  if (file.size > maxSize) {
    throw new Error(
      `Dosya boyutu en fazla ${settings.maxFileSizeMb} MB olabilir.`
    );
  }
}

async function uploadToBlob(file: File, token: string): Promise<UploadResult> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`ekran-goruntuleri/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    token,
  });

  return { url: blob.url, name: file.name };
}

async function uploadAsDataUrl(file: File): Promise<UploadResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;
  return { url: dataUrl, name: file.name };
}

export async function uploadScreenshot(file: File): Promise<UploadResult> {
  await validateScreenshot(file);

  const token = getBlobToken();
  if (token) {
    return uploadToBlob(file, token);
  }

  return uploadAsDataUrl(file);
}

export async function isAllowedImage(file: File): Promise<boolean> {
  const settings = await getAppSettings();
  const maxSize = settings.maxFileSizeMb * 1024 * 1024;
  return settings.allowedFileTypes.includes(file.type) && file.size <= maxSize;
}
