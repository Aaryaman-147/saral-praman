import "./globals.css";
import { LanguageProvider } from "@/components/LanguageContext";

// NOTE: This build environment has no network access to fonts.googleapis.com,
// so next/font/google cannot fetch Noto Sans / Noto Sans Devanagari / Special
// Elite here. We fall back to a system-font stack that still covers
// Devanagari well (most Android/Windows/iOS devices ship a Devanagari-capable
// system font) and is arguably a better choice for the slow-connection,
// low-end-device audience this product targets anyway — zero extra font
// bytes to download. In an environment with normal internet access, swapping
// back to next/font/google for Noto Sans is a one-line change (see git
// history / commented code in globals.css for the token wiring).
const fontVars = "";

export const metadata = {
  title: "Saral Praman — सरल प्रमाण",
  description:
    "Apply for an Income Certificate, track it stage by stage, and fix problems before they cause rejection. A hackathon prototype, not an official government service.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
