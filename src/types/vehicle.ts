import { z } from "zod";

export type VehicleCategory = "new" | "used";

export interface Vehicle {
  id: string;
  dealershipId: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrls: string[];
  category: VehicleCategory;
  featured: boolean;
}

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  price: z.number().nonnegative(),
  mileage: z.number().nonnegative(),
  imageUrls: z.array(z.string().url()).min(1).max(8),
  category: z.enum(["new", "used"]),
  featured: z.boolean(),
});
