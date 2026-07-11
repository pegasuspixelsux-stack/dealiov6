import type { Metadata } from "next";
import { Inter, Geist_Mono, Archivo_Black } from "next/font/google";
import { headers } from "next/headers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDealershipConfig, resolveDealershipId } from "@/lib/dealership/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return {
    title: dealership.seoDefaults.title,
    description: dealership.seoDefaults.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const dealership = getDealershipConfig(
    resolveDealershipId(headerList.get("host"))
  );

  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} ${archivoBlack.variable} h-full antialiased`}
      style={
        {
          "--brand-primary": dealership.primaryColor,
          "--brand-secondary": dealership.secondaryColor,
          "--brand-radius": dealership.radius,
          "--brand-radius-interactive": dealership.radiusInteractive,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
