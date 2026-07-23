"use client";

import Header from "@/components/Header";
import ScoreBoard from "@/components/ScoreBoard";
import { useI18n } from "@/lib/i18n";

export default function ViewerPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-5xl px-4 py-5">
      <Header subtitle={t("liveScores")} />
      <ScoreBoard />
    </main>
  );
}
