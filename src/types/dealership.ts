import { z } from "zod";

const businessHoursSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
});

const socialLinksSchema = z.object({
  facebook: z.string().url().optional(),
  instagram: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  youtube: z.string().url().optional(),
});

const financePartnerSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
  phone: z.string().optional(),
});

const tradeInSettingsSchema = z.object({
  enabled: z.boolean(),
  minYear: z.number().int().optional(),
});

const seoDefaultsSchema = z.object({
  title: z.string(),
  description: z.string(),
  ogImage: z.string().optional(),
});

export const dealershipConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  radius: z.string().default("0.625rem"),
  radiusInteractive: z.string().default("9999px"),
  phone: z.string(),
  whatsapp: z.string(),
  email: z.string().email(),
  address: z.string(),
  mapsLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
  hours: businessHoursSchema,
  socialLinks: socialLinksSchema,
  financePartner: financePartnerSchema.optional(),
  tradeInSettings: tradeInSettingsSchema,
  seoDefaults: seoDefaultsSchema,
});

export type DealershipConfig = z.infer<typeof dealershipConfigSchema>;
