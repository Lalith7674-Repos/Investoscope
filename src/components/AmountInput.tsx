"use client";

import { useState, useTransition } from "react";
import { setAmountPrefAction } from "@/lib/consent-actions";

export default function AmountInput({ defaultValue = 100 }: { defaultValue?: number }) {
  const [value, setValue] = useState<number>(defaultValue);
  const [pending, startTransition] = useTransition();

  function onBlur() {
    startTransition(async () => {
      await setAmountPrefAction(value);
    });
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      className="input-field"
      value={value}
      onChange={(e) => setValue(Number(e.target.value))}
      onBlur={onBlur}
      placeholder="Enter amount (₹)"
      disabled={pending}
    />
  );
}



