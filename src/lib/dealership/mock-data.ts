import type { DealershipConfig } from "@/types";

export const ULTIMA_DEALERSHIP_CONFIG: DealershipConfig = {
  id: "ultima-cars",
  name: "Ultima.cars",
  logoUrl: undefined,
  primaryColor: "#0d0d0d",
  secondaryColor: "#f9f9f9",
  radius: "0px",
  phone: "+1 (555) 010-0100",
  whatsapp: "+15550100100",
  email: "sales@ultima.cars.example",
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
    title: "Ultima.cars — High-Octane Automotive Experience",
    description:
      "Discover, finance, and trade in premium vehicles at Ultima.cars.",
  },
};
