"use client";

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

// ── Shared field wiring ──────────────────────────────────────────────────────
// <FormField> gives its control an id plus aria-describedby / aria-invalid, so
// pages never wire labels and error text by hand.

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; required: boolean };
const FieldContext = createContext<FieldContextValue | null>(null);

function useField(id?: string) {
  const field = useContext(FieldContext);
  return {
    id: id ?? field?.id,
    "aria-describedby": field?.describedBy,
    "aria-invalid": field?.invalid || undefined,
    required: field?.required || undefined,
  };
}

const controlBase =
  "w-full rounded-control border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted " +
  "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted " +
  "aria-invalid:border-error aria-invalid:focus:ring-error/25";

export function Label({ className, required, children, ...props }: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label className={cn("text-sm font-medium text-text", className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-error" aria-hidden="true">*</span>}
    </label>
  );
}

export type FormFieldProps = {
  label: ReactNode;
  /** Helper text shown under the control. */
  hint?: ReactNode;
  /** Error text; also marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Put the label beside the control (checkbox / switch rows). */
  inline?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormField({ label, hint, error, required = false, inline = false, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required }}>
      <div className={cn(inline ? "flex items-start gap-3" : "space-y-1.5", className)}>
        {inline ? (
          <>
            <div className="pt-0.5">{children}</div>
            <div className="min-w-0 space-y-0.5">
              <Label htmlFor={id} required={required}>{label}</Label>
              {hint && <p id={hintId} className="text-caption text-text-muted">{hint}</p>}
              {error && <p id={errorId} role="alert" className="text-caption font-medium text-error">{error}</p>}
            </div>
          </>
        ) : (
          <>
            <Label htmlFor={id} required={required} className="block">{label}</Label>
            {children}
            {hint && !error && <p id={hintId} className="text-caption text-text-muted">{hint}</p>}
            {error && <p id={errorId} role="alert" className="text-caption font-medium text-error">{error}</p>}
          </>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function Input({ className, id, ...props }: ComponentProps<"input">) {
  const field = useField(id);
  return <input {...field} {...props} className={cn(controlBase, "h-10", className)} />;
}

export function Textarea({ className, id, rows = 3, ...props }: ComponentProps<"textarea">) {
  const field = useField(id);
  return <textarea rows={rows} {...field} {...props} className={cn(controlBase, "py-2 leading-relaxed", className)} />;
}

export function Select({ className, id, children, ...props }: ComponentProps<"select">) {
  const field = useField(id);
  return (
    <div className="relative">
      <select {...field} {...props} className={cn(controlBase, "h-10 appearance-none pr-9", className)}>
        {children}
      </select>
      <ChevronDown size={16} aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
    </div>
  );
}

export function Checkbox({ className, id, ...props }: Omit<ComponentProps<"input">, "type">) {
  const field = useField(id);
  return (
    <input type="checkbox" {...field} {...props}
      className={cn("h-4 w-4 shrink-0 rounded border-border accent-primary disabled:opacity-50", className)} />
  );
}

export type SwitchProps = Omit<ComponentProps<"button">, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

export function Switch({ checked, onCheckedChange, className, id, disabled, ...props }: SwitchProps) {
  const field = useField(id);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={field.id}
      aria-describedby={field["aria-describedby"]}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-disabled",
        className,
      )}
      {...props}
    >
      <span className={cn(
        "inline-block h-5 w-5 rounded-full bg-white shadow-card transition-transform",
        checked ? "translate-x-5" : "translate-x-0.5",
      )} />
    </button>
  );
}
