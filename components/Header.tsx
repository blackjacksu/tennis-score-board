"use client";

import { useI18n } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

export default function Header({ subtitle }: { subtitle?: string }) {
  const { t } = useI18n();
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold">🎾 {t("appTitle")}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      <LanguageToggle />
    </header>
  );
}
