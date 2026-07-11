import { z } from "zod";

export const userRecordSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["owner", "manager", "salesperson"]),
  dealershipId: z.string(),
});

export type UserRecord = z.infer<typeof userRecordSchema>;
