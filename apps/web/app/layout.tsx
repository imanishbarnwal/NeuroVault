import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { Toaster } from "sonner";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeuroVault — Privacy-Preserving Neural Data Commons",
  description:
    "A decentralized platform for securely storing, sharing, and monetizing brain-computer interface research data. Powered by Filecoin, Lit Protocol, Flow, NEAR, and World ID.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${inter.variable}`}>
      <body className="bg-slate-950 text-slate-100 antialiased font-[family-name:var(--font-body)]">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgb(15 23 42)",
              border: "1px solid rgb(30 41 59)",
              color: "rgb(226 232 240)",
            },
          }}
        />
      </body>
    </html>
  );
}
