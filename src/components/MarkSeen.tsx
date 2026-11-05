"use client";

import { useEffect } from "react";
import { markSectionSeenAction } from "@/app/panel/actions";
import type { NotifySection } from "@/lib/data/notifications";

/** Sayfa açıldığında o bölümü okundu işaretler; menüdeki sayaç sıfırlanır.
 * Action, okunmamış bir şey yoksa hiçbir şey yazmadan döner — döngü olmaz. */
export function MarkSeen({ section }: { section: NotifySection }) {
  useEffect(() => {
    void markSectionSeenAction(section);
  }, [section]);

  return null;
}
