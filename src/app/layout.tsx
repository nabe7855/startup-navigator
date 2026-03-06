import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Startup Navigator | Mission Control",
  description:
    "Accelerate your entrepreneurial journey with smart progress tracking.",
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
    <html lang="ja">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
