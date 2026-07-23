"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export default function PinForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      router.push("/admin/matches");
      router.refresh();
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-xs space-y-3">
      <label className="block text-sm font-medium text-slate-600">
        {t("enterPin")}
      </label>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-2xl tracking-widest focus:border-blue-500 focus:outline-none"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{t("wrongPin")}</p>}
      <button
        type="submit"
        disabled={busy || pin.length === 0}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
      >
        {t("login")}
      </button>
    </form>
  );
}
