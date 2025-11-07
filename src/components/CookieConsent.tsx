"use client";

import { useEffect, useState, useTransition } from "react";
import { acceptConsentAction, declineConsentAction } from "@/lib/consent-actions";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = { hasConsentSSR: boolean };

export default function CookieConsent({ hasConsentSSR }: Props) {
  const [visible, setVisible] = useState(!hasConsentSSR);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisible(!hasConsentSSR);
  }, [hasConsentSSR]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-background/95 backdrop-blur p-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-1 text-sm leading-6">
            <p className="font-medium">We use cookies</p>
            <p className="text-muted-foreground">
              We use essential cookies to run the site. With your consent, we’ll also store
              simple preferences (last amount & category). No tracking unless you agree.
            </p>
          </div>

          <button
            aria-label="Close"
            onClick={() => setVisible(false)}
            className="p-1 rounded-md hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 justify-end">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await declineConsentAction();
                setVisible(false);
              })
            }
          >
            Decline
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await acceptConsentAction();
                setVisible(false);
              })
            }
          >
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}



