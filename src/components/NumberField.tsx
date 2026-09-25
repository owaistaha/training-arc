"use client";

import { Minus, Plus } from "./icons";

interface NumberFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  min: number;
  max: number;
  step?: number;
  placeholder: number;
  decimals?: boolean;
  onSubmit?: () => void;
}

/** Big numeric input with ± steppers (44 px+ tap targets). Value stays a string while typing. */
export function NumberField({ id, label, value, onChange, unit, min, max, step = 1, placeholder, decimals, onSubmit }: NumberFieldProps) {
  const bump = (dir: 1 | -1) => {
    const current = value === "" ? placeholder : Number(value);
    const next = Math.min(max, Math.max(min, (Number.isFinite(current) ? current : placeholder) + dir * step));
    onChange(String(decimals ? Math.round(next * 10) / 10 : Math.round(next)));
  };

  const sanitize = (raw: string) => {
    const cleaned = raw.replace(",", ".").replace(decimals ? /[^0-9.]/g : /[^0-9]/g, "");
    const [int, ...rest] = cleaned.split(".");
    return decimals && rest.length ? `${int.slice(0, 3)}.${rest.join("").slice(0, 1)}` : int.slice(0, 3);
  };

  const stepBtn =
    "flex size-14 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors hover:border-muted/50 active:bg-raised";

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface/50 px-3 py-6 transition-colors focus-within:border-accent/70">
      <button type="button" className={stepBtn} onClick={() => bump(-1)} aria-label={`Decrease ${label}`}>
        <Minus />
      </button>
      <label htmlFor={id} className="flex min-w-0 flex-1 items-baseline justify-center gap-1.5">
        <span className="sr-only">{label}</span>
        <input
          id={id}
          inputMode={decimals ? "decimal" : "numeric"}
          autoComplete="off"
          enterKeyHint="next"
          value={value}
          placeholder={String(placeholder)}
          onChange={(e) => onChange(sanitize(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && onSubmit?.()}
          className="w-[4.2ch] min-w-0 bg-transparent text-center font-display text-7xl leading-none tracking-wide text-fg caret-accent outline-hidden placeholder:text-line"
        />
        <span className="font-display text-2xl tracking-wider text-muted">{unit}</span>
      </label>
      <button type="button" className={stepBtn} onClick={() => bump(1)} aria-label={`Increase ${label}`}>
        <Plus />
      </button>
    </div>
  );
}
