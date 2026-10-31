import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const title = "P0rygon";
const description = "Design systems on a whiteboard. Then watch them break.";
const url = "https://p0rygon.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: {
    default: title,
    template: "%s | P0rygon",
  },
  description,
  keywords: [
    "system design",
    "whiteboard",
    "excalidraw",
    "traffic simulation",
    "architecture diagram",
    "interview prep",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: title,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
