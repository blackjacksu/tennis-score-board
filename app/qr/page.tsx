"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useI18n } from "@/lib/i18n";

export default function QrPage() {
  const { t } = useI18n();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) return null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-5">
      <Header subtitle={t("qrTitle")} />
      <button
        type="button"
        onClick={() => window.print()}
        className="no-print mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        🖨️ {t("print")}
      </button>

      <div className="grid gap-8 sm:grid-cols-2">
        <QrBlock title={t("qrViewer")} url={origin} />
        <QrBlock title={t("qrAdmin")} url={`${origin}/admin`} />
      </div>
    </main>
  );
}

function QrBlock({ title, url }: { title: string; url: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <QRCodeSVG value={url} size={220} marginSize={2} />
      <p className="mt-4 break-all text-xs text-slate-400">{url}</p>
    </div>
  );
}
