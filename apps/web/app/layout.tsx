import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flovia Agent Offers",
  description: "Personalized x402 checkout for Privy-authorized agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
