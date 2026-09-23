type StepperProps = {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
};

export function Stepper({ value, min = 1, max, onChange, label = "Quantity" }: StepperProps) {
  return (
    <div className="inline-flex items-center border border-line-strong">
      <button
        type="button"
        className="h-11 w-11 text-lg disabled:opacity-40"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <input
        aria-label={label}
        inputMode="numeric"
        className="h-11 w-14 border-x border-line-strong bg-canvas text-center tabular-nums outline-none"
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (!digits) {
            return;
          }
          const next = Number(digits);
          onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      <button
        type="button"
        className="h-11 w-11 text-lg disabled:opacity-40"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
