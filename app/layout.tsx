import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "AdSpark LeadFlow AI", description: "AI-assisted lead acquisition workspace for AdSpark Studio." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
