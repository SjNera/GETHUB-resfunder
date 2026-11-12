import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./resfunder.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ResFunder — Fund research. Pay honest answers.",
  description:
    "Student researchers lock a survey budget in a BNB Smart Chain escrow. Respondents are paid only for answers that pass screening.",
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
