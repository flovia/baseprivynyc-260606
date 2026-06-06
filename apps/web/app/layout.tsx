import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { publicAuthConfig } from "@flovia-baseprivynyc/config";
import { AppProviders } from "./providers";
import "./globals.css";

// Define the CSS variables globals.css expects (--font-geist / --font-geist-mono
// / --font-space-grotesk). Without these the display + mono type silently fell
// back to system fonts.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "Flovia Agent Offers",
  description: "Personalized x402 checkout for Privy-authorized agents.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body><AppProviders authConfig={publicAuthConfig}>{children}</AppProviders></body>
    </html>
  );
}
