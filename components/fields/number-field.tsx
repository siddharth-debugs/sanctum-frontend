import type { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface NumberFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  min?: number;
  max?: number;
  step?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  required,
  min,
  max,
  step,
  prefix,
  suffix,
  className,
}: NumberFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              <RequiredMark required={required} />
            </FormLabel>
          )}
          <FormControl>
            <div className="relative flex items-center">
              {prefix && (
                <span className="absolute left-3 text-sm text-muted-foreground">
                  {prefix}
                </span>
              )}
              <Input
                type="number"
                inputMode="numeric"
                placeholder={placeholder}
                disabled={disabled}
                min={min}
                max={max}
                step={step}
                className={prefix ? "pl-7" : suffix ? "pr-9" : undefined}
                {...field}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : e.target.valueAsNumber,
                  )
                }
              />
              {suffix && (
                <span className="absolute right-3 text-sm text-muted-foreground">
                  {suffix}
                </span>
              )}
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
