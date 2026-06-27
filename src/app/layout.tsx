import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Compliance Analyser — Consumer Duty conduct-risk review",
  description:
    "Analyses adviser↔customer call transcripts for Consumer Duty conduct risk — mis-selling, missing risk disclosures, pressure tactics, vulnerable-customer signals, unverified guarantees and data/consent handling — with explainable, severity-scored detection. Paste any call and it re-analyses live.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
