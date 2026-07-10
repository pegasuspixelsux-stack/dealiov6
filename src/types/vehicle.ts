export type VehicleCategory = "new" | "used";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  imageUrl: string;
  category: VehicleCategory;
  featured: boolean;
}
