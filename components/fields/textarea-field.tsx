import type { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { BaseFieldProps, RequiredMark } from "./field-context";

export interface TextareaFieldProps<T extends FieldValues>
  extends BaseFieldProps<T> {
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
}

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  disabled,
  required,
  rows = 4,
  maxLength,
  showCount,
  className,
}: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value as string) ?? "";
        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                <RequiredMark required={required} />
              </FormLabel>
            )}
            <FormControl>
              <div className="relative">
                <Textarea
                  rows={rows}
                  maxLength={maxLength}
                  placeholder={placeholder}
                  disabled={disabled}
                  className="resize-none"
                  {...field}
                  value={value}
                />
                {showCount && (
                  <span className="absolute bottom-2 right-3 text-[11px] text-muted-foreground">
                    {value.length}
                    {maxLength ? ` / ${maxLength}` : ""}
                  </span>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
