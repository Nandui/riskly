import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getCenterContext } from "@/lib/center-context";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-display",
  display: "swap",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Riskly — Risk assessments",
    template: "%s · Riskly",
  },
  description:
    "Document, monitor and reference health & safety risk assessments across your leisure centres.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { centers, selectedId } = await getCenterContext();

  return (
    <html
      lang="en-GB"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <AppShell centers={centers} selectedId={selectedId}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
