import type { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
}

export interface RadioGroupFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  options: RadioOption[];
  orientation?: "horizontal" | "vertical";
}

export function RadioGroupField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  required,
  options,
  orientation = "vertical",
  className,
}: RadioGroupFieldProps<T>) {
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
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value ?? ""}
              disabled={disabled}
              className={cn(
                orientation === "horizontal" ? "flex flex-wrap gap-3" : "gap-2",
              )}
            >
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                >
                  <RadioGroupItem value={o.value} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{o.label}</div>
                    {o.description && (
                      <div className="text-[11px] text-muted-foreground">
                        {o.description}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
