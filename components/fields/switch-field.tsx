import type { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { BaseFieldProps } from "./field-context";

export type SwitchFieldProps<T extends FieldValues> = BaseFieldProps<T>;

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: SwitchFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={`flex flex-row items-center justify-between rounded-lg border p-3.5 ${className ?? ""}`}
        >
          <div className="space-y-0.5">
            {label && <FormLabel className="text-sm">{label}</FormLabel>}
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
            <FormMessage />
          </div>
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
