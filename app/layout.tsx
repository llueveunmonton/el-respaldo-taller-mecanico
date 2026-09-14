import type { Metadata } from "next";
import { siteData } from "../lib/site-data";
import "./globals.css";

export const metadata: Metadata = {
  title: `${siteData.name} | ${siteData.descriptor}`,
  description: `${siteData.eyebrow}. ${siteData.subheadline}`,
  keywords: ["mecánica automotriz", "taller mecánico", "tren delantero", "alineación", "balanceo"],
  openGraph: {
    title: `${siteData.name} | ${siteData.headline}`,
    description: siteData.subheadline,
    type: "website",
    locale: "es_AR",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
