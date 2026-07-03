import { put } from "@vercel/blob";
import { getAppSettings } from "@/lib/queries/app-settings";

export type UploadResult = { url: string; name: string };

export async function uploadScreenshot(file: File): Promise<UploadResult> {
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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`ekran-goruntuleri/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return { url: blob.url, name: file.name };
}

export async function isAllowedImage(file: File): Promise<boolean> {
  const settings = await getAppSettings();
  const maxSize = settings.maxFileSizeMb * 1024 * 1024;
  return settings.allowedFileTypes.includes(file.type) && file.size <= maxSize;
}
