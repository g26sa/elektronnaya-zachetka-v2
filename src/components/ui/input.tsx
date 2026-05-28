import * as React from "react";
import { cn } from "@/lib/utils";
import { cv } from "@/lib/controlled-field";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const ALWAYS_CONTROLLED = new Set([
  "text",
  "search",
  "email",
  "password",
  "tel",
  "url",
  "date",
  "datetime-local",
  "month",
  "week",
  "time",
  "number",
  "hidden",
]);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", value, defaultValue, readOnly, onChange, ...props }, ref) => {
    const t = type ?? "text";
    const isControlledType = ALWAYS_CONTROLLED.has(t);

    if (readOnly && value !== undefined && onChange === undefined) {
      return (
        <input
          type={t}
          ref={ref}
          readOnly
          defaultValue={cv(value)}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      );
    }

    // value задаётся явно (useState) — контролируемый режим.
    // {...register()} без value — неконтролируемый, defaultValues из react-hook-form.
    const forceValue = isControlledType && value !== undefined;

    return (
      <input
        type={t}
        ref={ref}
        readOnly={readOnly}
        onChange={onChange}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
        {...(defaultValue !== undefined && !forceValue ? { defaultValue } : {})}
        {...(forceValue ? { value: cv(value) } : value !== undefined ? { value } : {})}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
