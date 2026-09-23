import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Chip({ active = false, className, type = "button", ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={cx(
        "shrink-0 border px-3 py-1.5 text-sm",
        active ? "border-accent bg-accent text-white" : "border-line-strong bg-canvas text-ink hover:border-ink",
        className,
      )}
      {...props}
    />
  );
}
