import type { UseFormRegisterReturn } from "react-hook-form";

/** Связывает register() с useWatch — value и onChange всегда вместе. */
export function bindSelect(
  reg: UseFormRegisterReturn,
  watched: string | undefined | null
): UseFormRegisterReturn & { value: string } {
  const { onChange, onBlur, name, ref } = reg;
  return { name, ref, onBlur, onChange, value: watched ?? "" };
}
