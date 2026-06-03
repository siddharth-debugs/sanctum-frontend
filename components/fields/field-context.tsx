import * as React from "react";
import type { Control, FieldValues, FieldPath } from "react-hook-form";

/** Shared prop contract for every field in the picker set. */
export interface BaseFieldProps<
  TForm extends FieldValues,
  TName extends FieldPath<TForm> = FieldPath<TForm>,
> {
  control: Control<TForm>;
  name: TName;
  label?: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function RequiredMark({ required }: { required?: boolean }) {
  if (!required) return null;
  return <span className="text-destructive"> *</span>;
}
