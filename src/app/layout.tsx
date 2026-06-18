import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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

// Every page renders live, per-request data from the database — never
// statically generated at build time.
export const dynamic = "force-dynamic";

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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
