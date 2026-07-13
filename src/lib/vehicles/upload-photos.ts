import "server-only";
import { adminStorage } from "@/lib/firebase/admin";

export async function uploadVehiclePhotos(
  dealershipId: string,
  vehicleId: string,
  files: File[]
): Promise<string[]> {
  if (!adminStorage) {
    throw new Error("Firebase Storage is not configured.");
  }

  const bucket = adminStorage.bucket();

  return Promise.all(
    files.map(async (file, index) => {
      const path = `dealerships/${dealershipId}/vehicles/${vehicleId}/${Date.now()}-${index}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageFile = bucket.file(path);
      await storageFile.save(buffer, { contentType: file.type });
      await storageFile.makePublic();
      return `https://storage.googleapis.com/${bucket.name}/${path}`;
    })
  );
}
