import type { Vehicle } from "@/types";

/**
 * Placeholder inventory for the homepage only. The real Inventory feature
 * (Firestore-backed, per the product spec) replaces this with live data.
 */
export const MOCK_VEHICLES: Vehicle[] = [
  { id: "v1", make: "Ultima", model: "GTR", year: 2024, price: 89500, mileage: 1200, imageUrl: "/vehicles/placeholder-1.jpg", category: "new", featured: true },
  { id: "v2", make: "Ultima", model: "Evo-X", year: 2024, price: 76900, mileage: 800, imageUrl: "/vehicles/placeholder-2.jpg", category: "new", featured: true },
  { id: "v3", make: "Ultima", model: "Roadster S", year: 2023, price: 64500, mileage: 5400, imageUrl: "/vehicles/placeholder-3.jpg", category: "used", featured: true },
  { id: "v4", make: "Ultima", model: "Apex", year: 2023, price: 58900, mileage: 8900, imageUrl: "/vehicles/placeholder-4.jpg", category: "used", featured: false },
  { id: "v5", make: "Ultima", model: "Vantage", year: 2022, price: 52400, mileage: 14200, imageUrl: "/vehicles/placeholder-5.jpg", category: "used", featured: false },
  { id: "v6", make: "Ultima", model: "Cross", year: 2024, price: 71200, mileage: 300, imageUrl: "/vehicles/placeholder-6.jpg", category: "new", featured: false },
  { id: "v7", make: "Ultima", model: "Coupe RS", year: 2023, price: 68700, mileage: 6100, imageUrl: "/vehicles/placeholder-7.jpg", category: "used", featured: false },
  { id: "v8", make: "Ultima", model: "GT Sport", year: 2024, price: 94300, mileage: 450, imageUrl: "/vehicles/placeholder-8.jpg", category: "new", featured: false },
  { id: "v9", make: "Ultima", model: "Legacy", year: 2022, price: 47600, mileage: 21000, imageUrl: "/vehicles/placeholder-9.jpg", category: "used", featured: false },
];
