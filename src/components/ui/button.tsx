"use client";

import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none h-9 px-4 py-2";
    const styles =
      variant === "outline"
        ? "border bg-transparent hover:bg-muted"
        : "bg-primary text-primary-foreground hover:opacity-90";
    return (
      <button ref={ref} className={`${base} ${styles} ${className}`} {...props} />
    );
  }
);
Button.displayName = "Button";
