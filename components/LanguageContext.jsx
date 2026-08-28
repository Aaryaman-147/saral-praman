"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(undefined);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("saral-praman-lang");
    if (saved === "hi" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l) => {
    setLangState(l);
    window.localStorage.setItem("saral-praman-lang", l);
  };

  const t = (en, hi) => (lang === "hi" ? hi : en);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
