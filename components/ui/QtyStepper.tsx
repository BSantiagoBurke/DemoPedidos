"use client";

type QtyStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  size?: "md" | "sm";
};

export function QtyStepper({ value, onChange, min = 1, max = 99, label, size = "md" }: QtyStepperProps) {
  const btn = size === "md" ? "size-11 text-xl" : "size-11 text-lg";
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface" role="group" aria-label={label}>
      <button type="button" className={`${btn} grid place-items-center rounded-full font-bold disabled:opacity-30`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={value - 1 < 1 ? "Quitar" : "Restar uno"}>
        {value - 1 < 1 ? <TrashIcon /> : "−"}
      </button>
      <output className="min-w-7 text-center font-semibold tabular-nums" aria-live="polite">{value}</output>
      <button type="button" className={`${btn} grid place-items-center rounded-full font-bold disabled:opacity-30`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Sumar uno">
        +
      </button>
    </div>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
