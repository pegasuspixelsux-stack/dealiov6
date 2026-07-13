import { z } from "zod";

export type VehicleCategory = "new" | "used";
export type Fuel = "nafta" | "diesel" | "hibrido" | "electrico";
export type Transmission = "manual" | "automatica";
export type VehicleStatus = "disponible" | "reservado" | "vendido";
export type BodyType =
  | "sedan"
  | "suv"
  | "hatchback"
  | "pickup"
  | "coupe"
  | "furgon";

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
  version: string;
  fuel: Fuel;
  transmission: Transmission;
  location: string;
  financingAvailable: boolean;
  status: VehicleStatus;
  description: string;
  features: string[];
  color: string;
  bodyType: BodyType;
  monthlyPayment?: number;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
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
  version: z.string().default(""),
  fuel: z.enum(["nafta", "diesel", "hibrido", "electrico"]).default("nafta"),
  transmission: z.enum(["manual", "automatica"]).default("manual"),
  location: z.string().default(""),
  financingAvailable: z.boolean().default(false),
  status: z.enum(["disponible", "reservado", "vendido"]).default("disponible"),
  description: z.string().default(""),
  features: z.array(z.string()).default([]),
  color: z.string().default(""),
  bodyType: z
    .enum(["sedan", "suv", "hatchback", "pickup", "coupe", "furgon"])
    .default("sedan"),
  monthlyPayment: z.number().positive().optional(),
});

export const FUEL_LABELS: Record<Fuel, string> = {
  nafta: "Nafta",
  diesel: "Diesel",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  manual: "Manual",
  automatica: "Automática",
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  sedan: "Sedán",
  suv: "SUV",
  hatchback: "Hatchback",
  pickup: "Pickup",
  coupe: "Coupé",
  furgon: "Furgón",
};

export const VEHICLE_FEATURES = [
  "Airbags",
  "ABS",
  "Control de estabilidad",
  "Cámara de retroceso",
  "Sensores de estacionamiento",
  "Aire acondicionado",
  "Pantalla multimedia",
  "Bluetooth",
  "Asientos eléctricos",
  "Apple CarPlay",
  "Android Auto",
  "Keyless entry",
  "Puerto USB de carga",
] as const;
