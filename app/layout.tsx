import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Admin",
  description: "Private editor for resume.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
