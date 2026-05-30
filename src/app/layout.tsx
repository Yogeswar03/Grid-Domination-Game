import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Territory Domination — Tactical Command Interface",
  description:
    "Realtime multiplayer territory domination. Capture hexagonal sectors, expand your influence, and dominate the battlefield in this live tactical strategy experience.",
  keywords: [
    "territory",
    "domination",
    "multiplayer",
    "realtime",
    "strategy",
    "hex grid",
    "tactical",
  ],
  authors: [{ name: "Territory Domination" }],
  openGraph: {
    title: "Territory Domination",
    description: "Realtime multiplayer territory control on a hexagonal battlefield",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
