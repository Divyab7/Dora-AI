/**
 * AP2 Mandate storage.
 * Persists signed cryptographic mandates to LocalStorage.
 */

import { getItem, setItem, removeItem } from "./local";
import type { MandateRecord } from "@/types/wallet";

const MANDATES_KEY = "mandates";

export function loadMandates(): MandateRecord[] {
  return getItem<MandateRecord[]>(MANDATES_KEY, []);
}

export function saveMandates(mandates: MandateRecord[]): boolean {
  return setItem(MANDATES_KEY, mandates);
}

export function addMandate(mandate: MandateRecord): MandateRecord[] {
  const mandates = loadMandates();
  const existing = mandates.findIndex((m) => m.mandateId === mandate.mandateId);
  if (existing >= 0) {
    mandates[existing] = mandate;
  } else {
    mandates.push(mandate);
  }
  saveMandates(mandates);
  return mandates;
}

export function revokeMandate(mandateId: string): MandateRecord[] {
  const mandates = loadMandates().filter((m) => m.mandateId !== mandateId);
  saveMandates(mandates);
  return mandates;
}

export function clearMandates(): void {
  removeItem(MANDATES_KEY);
}
