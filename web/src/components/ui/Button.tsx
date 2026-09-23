import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text" | "danger";
  busy?: boolean;
  busyLabel?: string;
};

const variants = {
  primary: "border-accent bg-accent text-white hover:border-charcoal hover:bg-charcoal",
  secondary: "border-line-strong bg-transparent text-ink hover:bg-surface",
  text: "border-transparent bg-transparent px-0 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink",
  danger: "border-danger bg-transparent text-danger hover:bg-danger hover:text-white",
};

export function Button({
  variant = "primary",
  busy = false,
  busyLabel,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cx(
        "inline-flex items-center justify-center border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    >
      {busy ? busyLabel ?? children : children}
    </button>
  );
}
