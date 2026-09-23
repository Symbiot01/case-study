import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

const controlClass =
  "w-full border bg-canvas px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-ink";

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, type, className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;
  const secret = type === "password";

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={secret && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cx(controlClass, secret && "pr-16", error ? "border-danger" : "border-line-strong")}
          {...props}
          ref={ref}
        />
        {secret ? (
          <button
            type="button"
            className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="mt-2 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export function SelectField({ label, error, id, children, className, ...props }: SelectFieldProps) {
  const selectId = id ?? props.name;
  return (
    <div className={className}>
      <label htmlFor={selectId} className="mb-1.5 block text-sm">
        {label}
      </label>
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cx(controlClass, error ? "border-danger" : "border-line-strong")}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={`${selectId}-error`} role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
