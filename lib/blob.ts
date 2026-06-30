import { put } from "@vercel/blob";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export type UploadResult = { url: string; name: string };

export async function uploadScreenshot(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Yalnızca ekran görüntüsü yükleyebilirsiniz (PNG, JPG veya WEBP)."
    );
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Dosya boyutu en fazla 5 MB olabilir.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`ekran-goruntuleri/${Date.now()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return { url: blob.url, name: file.name };
}

export function isAllowedImage(file: File): boolean {
  return ALLOWED_TYPES.includes(file.type) && file.size <= MAX_SIZE;
}
