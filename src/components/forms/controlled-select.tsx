import type { SelectHTMLAttributes } from "react";

/** Select с react-hook-form: value только если есть onChange из register. */
export function controlledSelectProps(
  props: SelectHTMLAttributes<HTMLSelectElement>
): SelectHTMLAttributes<HTMLSelectElement> {
  const { value, onChange, defaultValue, ...rest } = props;
  if (onChange) {
    if (value !== undefined && value !== null) {
      return { ...rest, onChange, value: String(value) };
    }
    return { ...rest, onChange };
  }
  if (defaultValue !== undefined) {
    return { ...rest, defaultValue };
  }
  if (value !== undefined && value !== null) {
    return { ...rest, defaultValue: String(value) };
  }
  return rest;
}
