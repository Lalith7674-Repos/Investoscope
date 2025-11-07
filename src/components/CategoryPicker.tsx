"use client";

import { useTransition } from "react";
import { setCategoryPrefAction } from "@/lib/consent-actions";
import { Button } from "@/components/ui/button";

const categories = [
  { key: "STOCK", label: "Stocks" },
  { key: "MUTUAL_FUND", label: "Mutual Funds" },
  { key: "SIP", label: "SIP" },
  { key: "ETF", label: "ETFs" },
];

export default function CategoryPicker({ defaultKey }: { defaultKey?: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {categories.map((c) => (
        <Button
          key={c.key}
          variant={c.key === defaultKey ? "default" : "outline"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setCategoryPrefAction(c.key);
            })
          }
          className="rounded-2xl"
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}



