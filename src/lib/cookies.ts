"use server";

import { cookies } from "next/headers";

const CONSENT_KEY = "cookie_consent";       // "true" | "false"
const PREF_AMOUNT = "last_amount";
const PREF_CATEGORY = "last_category";

const cookieOpts = {
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export async function getConsent(): Promise<boolean> {
  const store = await cookies();
  return store.get(CONSENT_KEY)?.value === "true";
}

export async function setConsent(value: boolean) {
  const store = await cookies();
  store.set(CONSENT_KEY, value ? "true" : "false", cookieOpts);
}

export async function getPrefAmount(): Promise<string | null> {
  const store = await cookies();
  return store.get(PREF_AMOUNT)?.value ?? null;
}

export async function setPrefAmount(value: number | string) {
  const store = await cookies();
  store.set(PREF_AMOUNT, String(value), cookieOpts);
}

export async function getPrefCategory(): Promise<string | null> {
  const store = await cookies();
  return store.get(PREF_CATEGORY)?.value ?? null;
}

export async function setPrefCategory(value: string) {
  const store = await cookies();
  store.set(PREF_CATEGORY, value, cookieOpts);
}


