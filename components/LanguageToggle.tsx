"use client";

import { useI18n } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      className="no-print rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm active:scale-95"
      aria-label="Switch language"
    >
      {lang === "zh" ? "English" : "中文"}
    </button>
  );
}
