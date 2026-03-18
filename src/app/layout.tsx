import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import "cropperjs/dist/cropper.css";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TeamPulse",
  description: "Sportovní týmový systém",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className={lexend.className}>
        {children}
      </body>
    </html>
  );
}
