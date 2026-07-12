import { z } from "zod";

export interface Brand {
  id: string;
  dealershipId: string;
  name: string;
  logoUrl: string;
}

export const brandSchema = z.object({
  name: z.string().min(1),
});
