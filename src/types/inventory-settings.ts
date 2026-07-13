import { z } from "zod";

export interface InventorySettings {
  staleListingDays: number;
}

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  staleListingDays: 60,
};

export const inventorySettingsSchema = z.object({
  staleListingDays: z.number().positive(),
});
