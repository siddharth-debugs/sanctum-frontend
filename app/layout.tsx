import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { Providers } from "./providers";
import { ThemeStyles } from "@/theme/theme-styles";

export const metadata: Metadata = {
  title: {
    default: "Sanctum",
    template: "%s · Sanctum",
  },
  description:
    "Premium agency client portal — plan content, get approvals, share a branded read-only link.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeStyles />
      </head>
      <body className={`${fontVariables} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
