import type { DealershipConfig } from "@/types";

export const DEMO_DEALERSHIP_CONFIG: DealershipConfig = {
  id: "demo-dealership",
  name: "Demo Motors",
  logoUrl: undefined,
  primaryColor: "oklch(0.55 0.18 255)",
  secondaryColor: "oklch(0.7 0.15 145)",
  phone: "+1 (555) 010-0100",
  whatsapp: "+15550100100",
  email: "sales@demomotors.example",
  address: "123 Auto Row, Springfield, ST 00000",
  mapsLocation: { lat: 39.7817, lng: -89.6501 },
  hours: {
    monday: "9:00 AM - 7:00 PM",
    tuesday: "9:00 AM - 7:00 PM",
    wednesday: "9:00 AM - 7:00 PM",
    thursday: "9:00 AM - 7:00 PM",
    friday: "9:00 AM - 7:00 PM",
    saturday: "9:00 AM - 5:00 PM",
    sunday: "Closed",
  },
  socialLinks: {},
  financePartner: undefined,
  tradeInSettings: { enabled: true, minYear: 2005 },
  seoDefaults: {
    title: "Demo Motors — Quality Vehicles",
    description: "Browse new and used vehicles at Demo Motors.",
  },
};
