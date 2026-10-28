"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { badgeClass } from "@/lib/ui";
import { formatTl } from "@/lib/data/panel";
import type { PeriodDetailUnit } from "@/lib/data/admin";
import { sendDebtSmsAction, autoSendIfNeededAction, type SendState } from "./actions";

const initialSendState: SendState = {};

function eligible(unit: PeriodDetailUnit) {
  return unit.accounts.filter((a) => a.isActive && a.phone);
}

export function PeriodDetailClient({
  periodId,
  units,
  autosend,
}: {
  periodId: string;
  units: PeriodDetailUnit[];
  autosend: boolean;
}) {
  const allEligibleIds = useMemo(
    () => units.flatMap(eligible).map((a) => a.accountId),
    [units],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set(allEligibleIds));
  const [sendState, sendAction, sendPending] = useActionState(sendDebtSmsAction, initialSendState);
  const [autoState, setAutoState] = useState<SendState | null>(null);
  const [autoRunning, setAutoRunning] = useState(autosend);

  useEffect(() => {
    if (!autosend) return;
    let cancelled = false;
    autoSendIfNeededAction(periodId).then((result) => {
      if (!cancelled) {
        setAutoState(result);
        setAutoRunning(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // Sadece mount'ta bir kez çalışsın.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(accountId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) next.delete(accountId);
      else next.add(accountId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === allEligibleIds.length ? new Set() : new Set(allEligibleIds)));
  }

  return (
    <div className="flex flex-col gap-4">
      {autoRunning && (
        <p className={badgeClass("navy")}>Otomatik SMS gönderiliyor, lütfen bekleyin...</p>
      )}
      {autoState?.skippedReason === "already_sent" && (
        <p className="text-sm text-muted">Bu dönem için borç SMS'i daha önce gönderilmiş, otomatik gönderim atlandı.</p>
      )}
      {autoState?.skippedReason === "no_eligible_accounts" && (
        <p className="text-sm text-muted">Telefonu kayıtlı, aktif hesap bulunamadığı için otomatik gönderim yapılmadı.</p>
      )}
      {autoState?.result && (
        <p className={badgeClass("green")}>
          Otomatik gönderim: {autoState.result.sent} başarılı, {autoState.result.failed} başarısız ({autoState.result.attempted} hesap).
        </p>
      )}

      <form action={sendAction} className="flex flex-col gap-3">
        <input type="hidden" name="periodId" value={periodId} />
        {Array.from(selected).map((id) => (
          <input key={id} type="hidden" name="accountIds" value={id} />
        ))}

        <div className="flex items-center justify-between">
          <button type="button" onClick={toggleAll} className="text-sm font-medium text-brand-navy hover:underline">
            {selected.size === allEligibleIds.length ? "Tümünü Kaldır" : "Tümünü Seç"}
          </button>
          <button
            type="submit"
            disabled={sendPending || selected.size === 0}
            className="inline-flex items-center justify-center rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendPending ? "Gönderiliyor..." : `Seçili ${selected.size} Hesaba Gönder`}
          </button>
        </div>

        {sendState.error && <p className="text-sm text-brand-red">{sendState.error}</p>}
        {sendState.result && (
          <p className={badgeClass("green")}>
            {sendState.result.sent} başarılı, {sendState.result.failed} başarısız ({sendState.result.attempted} hesap).
          </p>
        )}

        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full border-separate border-spacing-x-4 text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-border py-3 pl-4">Daire</th>
                <th className="border-b border-border">Aidat</th>
                <th className="border-b border-border">Demirbaş</th>
                <th className="border-b border-border">Hesap</th>
                <th className="border-b border-border">Telefon</th>
                <th className="border-b border-border">Son SMS</th>
                <th className="border-b border-border pr-4">Gönder</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const rows = unit.accounts.length > 0 ? unit.accounts : [null];
                return rows.map((acc, i) => (
                  <tr key={`${unit.unitId}-${i}`}>
                    {i === 0 && (
                      <>
                        <td className="border-b border-border py-3 pl-4 font-medium text-foreground" rowSpan={rows.length}>
                          {unit.daireNo}
                        </td>
                        <td className="border-b border-border tabular-nums text-foreground" rowSpan={rows.length}>
                          {formatTl(unit.aidatToplam)}
                        </td>
                        <td className="border-b border-border tabular-nums text-foreground" rowSpan={rows.length}>
                          {unit.demirbasToplam !== null ? formatTl(unit.demirbasToplam) : "-"}
                        </td>
                      </>
                    )}
                    {!acc ? (
                      <td colSpan={4} className="border-b border-border pr-4 text-muted">
                        Hesap yok
                      </td>
                    ) : (
                      <>
                        <td className="border-b border-border text-foreground">
                          {acc.role === "owner" ? "Ev Sahibi" : "Kiracı"} · {acc.fullName}
                        </td>
                        <td className="border-b border-border text-muted">{acc.phone ?? "-"}</td>
                        <td className="border-b border-border">
                          {acc.lastSmsAt ? (
                            <span className={badgeClass(acc.lastSmsStatus === "sent" ? "green" : "red")}>
                              {new Date(acc.lastSmsAt).toLocaleString("tr-TR")}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="border-b border-border pr-4">
                          {acc.isActive && acc.phone ? (
                            <input
                              type="checkbox"
                              checked={selected.has(acc.accountId)}
                              onChange={() => toggle(acc.accountId)}
                              className="accent-brand-navy"
                            />
                          ) : (
                            <span className="text-xs text-muted">-</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
