import { DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const language = (await headers()).get("x-camikk-language") === "en" ? "en" : "es";
  return (
    <html lang={language}>
      <body className={dmSans.variable}>{children}</body>
    </html>
  );
}
