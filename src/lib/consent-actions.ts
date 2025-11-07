"use server";

import { setConsent, setPrefAmount, setPrefCategory } from "./cookies";

export async function acceptConsentAction() {
  await setConsent(true);
}

export async function declineConsentAction() {
  await setConsent(false);
}

export async function setAmountPrefAction(amount: number) {
  await setPrefAmount(amount);
}

export async function setCategoryPrefAction(category: string) {
  await setPrefCategory(category);
}
