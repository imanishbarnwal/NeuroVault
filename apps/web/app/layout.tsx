import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "NeuroVault",
  description:
    "A privacy-preserving neural data commons for brain-computer interface research",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
