"use client";

import { PARALLEL_MATCHES, formatClock } from "@/lib/schedule";
import { useI18n } from "@/lib/i18n";

/**
 * Heading for one time block on the score / admin boards: start time, the
 * window it runs, and an "all N courts" note when the block fills every court.
 * Shared so the viewer and the admin read identically.
 */
export default function TimeBlockHeader({
  startMinutes,
  endMinutes,
  full,
}: {
  startMinutes: number;
  endMinutes: number;
  full: boolean;
}) {
  const { t } = useI18n();
  return (
    <h2 className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1">
      <span className="text-base font-black tabular-nums text-slate-900">
        {formatClock(startMinutes)}
      </span>
      <span className="text-xs font-medium text-slate-400">
        {t("eventDay")} · {formatClock(startMinutes)}–{formatClock(endMinutes)}
      </span>
      {full && (
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          · {t("allCourts", { n: PARALLEL_MATCHES })}
        </span>
      )}
    </h2>
  );
}
