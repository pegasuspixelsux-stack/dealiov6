import "server-only";
import { adminStorage } from "@/lib/firebase/admin";

export async function uploadDealershipLogo(
  dealershipId: string,
  file: File
): Promise<string> {
  if (!adminStorage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const bucket = adminStorage.bucket();
  const path = `dealerships/${dealershipId}/branding/logo-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageFile = bucket.file(path);
  await storageFile.save(buffer, { contentType: file.type });
  await storageFile.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}
