"use client";

import Link from "next/link";
import { ScrollText } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export default function Header() {
  const { lang, setLang, t } = useLanguage();

  return (
    <header className="border-b-2 border-rule bg-paper-raised sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 grid place-items-center w-9 h-9 rounded-full bg-authority text-paper">
            <ScrollText size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold leading-tight truncate">
              {t("Saral Praman", "सरल प्रमाण")}
            </span>
            <span className="block text-[11px] text-ink-soft leading-tight truncate">
              {t("Not an official government website", "यह आधिकारिक सरकारी वेबसाइट नहीं है")}
            </span>
          </span>
        </Link>

        <div
          role="group"
          aria-label={t("Choose language", "भाषा चुनें")}
          className="flex rounded-full border-2 border-authority overflow-hidden text-sm font-medium shrink-0"
        >
          <button
            onClick={() => setLang("en")}
            aria-pressed={lang === "en"}
            className={`px-3 py-1.5 ${lang === "en" ? "bg-authority text-paper" : "bg-transparent text-authority"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("hi")}
            aria-pressed={lang === "hi"}
            className={`px-3 py-1.5 ${lang === "hi" ? "bg-authority text-paper" : "bg-transparent text-authority"}`}
          >
            हिं
          </button>
        </div>
      </div>
    </header>
  );
}
