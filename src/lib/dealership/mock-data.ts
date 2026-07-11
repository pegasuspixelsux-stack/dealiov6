import type { DealershipConfig } from "@/types";

export const ULTIMA_DEALERSHIP_CONFIG: DealershipConfig = {
  id: "ultima-cars",
  name: "Ultima.cars",
  logoUrl: undefined,
  primaryColor: "#0d0d0d",
  secondaryColor: "#D8D6D3",
  radius: "0px",
  radiusInteractive: "9999px",
  phone: "+598 2900 1234",
  whatsapp: "+59891001234",
  email: "ventas@ultima.cars.example",
  address: "Av. 18 de Julio 1234, Montevideo, Uruguay",
  mapsLocation: { lat: -34.9011, lng: -56.1645 },
  hours: {
    monday: "09:00 - 19:00",
    tuesday: "09:00 - 19:00",
    wednesday: "09:00 - 19:00",
    thursday: "09:00 - 19:00",
    friday: "09:00 - 19:00",
    saturday: "09:00 - 17:00",
    sunday: "Cerrado",
  },
  socialLinks: {},
  financePartner: undefined,
  tradeInSettings: { enabled: true, minYear: 2005 },
  seoDefaults: {
    title: "Ultima.cars — Experiencia Automotriz de Alto Octanaje",
    description:
      "Descubrí, financiá y canjeá vehículos premium en Ultima.cars.",
  },
};
