"use client";

import { Fragment, useActionState, useEffect, useMemo, useState } from "react";
import { badgeClass, inputClass } from "@/lib/ui";
import { toggleAccountActiveAction, updateAccountAction, type UpdateAccountState } from "./actions";

type AccountRow = {
  id: string;
  role: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  synthetic_email: string;
};

type UnitRow = {
  id: string;
  daire_no: string;
  accounts: AccountRow[] | unknown;
};

function normalize(s: string): string {
  return s.toLocaleLowerCase("tr-TR");
}

const initialUpdateState: UpdateAccountState = {};

function AccountCells({ acc }: { acc: AccountRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateAccountAction.bind(null, acc.id),
    initialUpdateState,
  );

  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  if (editing) {
    const formId = `edit-form-${acc.id}`;
    // key="edit" (ayrı dal, altındaki `key="view"` dalıyla farklı ağaç): React'in
    // "Düzenle" <button type="button"> düğümünü "Kaydet" <button type="submit">
    // ile aynı DOM node olarak yeniden kullanıp yerinde mutasyona uğratmasını
    // engeller. Aksi halde, tıklama olayının tarayıcı tarafındaki varsayılan
    // eylemi (click sonrası) hâlâ işlenirken React senkron biçimde aynı düğümü
    // submit tipine çevirdiği için, TEK bir "Düzenle" tıklaması formu
    // kendiliğinden gönderiyordu (gerçek kullanıcı tıklamalarında — programatik
    // tetiklemelerde değil — yeniden üretildi ve doğrulandı).
    return (
      <Fragment key="edit">
        <td className="border-b border-border py-2">
          <form id={formId} action={formAction}>
            <input name="fullName" defaultValue={acc.full_name} required className={`w-full ${inputClass}`} />
          </form>
        </td>
        <td className="border-b border-border py-2">
          <input
            name="phone"
            form={formId}
            defaultValue={acc.phone ?? ""}
            placeholder="Telefon"
            className={`w-full ${inputClass}`}
          />
        </td>
        <td className="border-b border-border">
          <span className={badgeClass(acc.is_active ? "green" : "gray")}>
            {acc.is_active ? "Aktif" : "Pasif"}
          </span>
        </td>
        <td className="border-b border-border pr-4">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              form={formId}
              disabled={pending}
              className="text-xs font-medium text-brand-navy hover:underline disabled:opacity-50"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs font-medium text-muted hover:underline"
            >
              İptal
            </button>
          </div>
          {state.error && <p className="mt-1 text-xs text-brand-red">{state.error}</p>}
        </td>
      </Fragment>
    );
  }

  return (
    <Fragment key="view">
      <td className="border-b border-border text-foreground">{acc.full_name}</td>
      <td className="border-b border-border text-muted">{acc.phone ?? "-"}</td>
      <td className="border-b border-border">
        <span className={badgeClass(acc.is_active ? "green" : "gray")}>
          {acc.is_active ? "Aktif" : "Pasif"}
        </span>
      </td>
      <td className="border-b border-border pr-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-brand-navy hover:underline"
          >
            Düzenle
          </button>
          <form action={toggleAccountActiveAction.bind(null, acc.id, !acc.is_active)}>
            <button type="submit" className="text-xs font-medium text-brand-navy hover:underline">
              {acc.is_active ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </form>
        </div>
      </td>
    </Fragment>
  );
}

export function SakinlerTable({ units }: { units: UnitRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return units;
    return units.filter((unit) => {
      const accounts = (unit.accounts as AccountRow[]) ?? [];
      if (normalize(unit.daire_no).includes(q)) return true;
      return accounts.some(
        (a) => normalize(a.full_name).includes(q) || (a.phone ?? "").includes(q),
      );
    });
  }, [units, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Daire no, isim veya telefon ara..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`max-w-sm ${inputClass}`}
      />

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <table className="w-full border-separate border-spacing-x-4 text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="border-b border-border py-3 pl-4">Daire</th>
              <th className="border-b border-border">Hesap</th>
              <th className="border-b border-border">Ad Soyad</th>
              <th className="border-b border-border">Telefon</th>
              <th className="border-b border-border">Durum</th>
              <th className="border-b border-border pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="border-b border-border py-3 pl-4 text-muted">
                  Eşleşen daire bulunamadı.
                </td>
              </tr>
            )}
            {filtered.map((unit) => {
              const accounts = (unit.accounts as AccountRow[]) ?? [];
              if (accounts.length === 0) {
                return (
                  <tr key={unit.id}>
                    <td className="border-b border-border py-3 pl-4 font-medium text-foreground">{unit.daire_no}</td>
                    <td colSpan={5} className="border-b border-border pr-4 text-muted">
                      Henüz hesap yok
                    </td>
                  </tr>
                );
              }
              return accounts.map((acc, i) => (
                <tr key={acc.id}>
                  {i === 0 && (
                    <td className="border-b border-border py-3 pl-4 font-medium text-foreground" rowSpan={accounts.length}>
                      {unit.daire_no}
                    </td>
                  )}
                  <td className="border-b border-border text-foreground">{acc.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                  <AccountCells acc={acc} />
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
