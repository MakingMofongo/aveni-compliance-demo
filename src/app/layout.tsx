import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CallGuard — adviser-call compliance & conduct-risk analysis",
  description:
    "Ingests adviser↔customer call transcripts and flags Consumer Duty conduct risk — mis-selling, missing risk disclosures, pressure tactics, vulnerable-customer signals, unverified guarantees and data/consent handling — with explainable, severity-scored detection.",
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
